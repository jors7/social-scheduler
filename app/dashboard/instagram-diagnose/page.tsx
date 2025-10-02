'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@supabase/ssr'

export default function InstagramDiagnosePage() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/instagram/diagnose', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Diagnostic failed')
        return
      }

      setDiagnostics(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Instagram Diagnostics</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Run Diagnostics</CardTitle>
          <CardDescription>
            This will test your Instagram connection and show what the API can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run Diagnostics'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {diagnostics && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Info</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
                {JSON.stringify(diagnostics.database, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {Object.entries(diagnostics.tests).map(([testName, testData]: [string, any]) => (
            <Card key={testName} className={testData.success ? 'border-green-500' : 'border-red-500'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {testData.success ? '✅' : '❌'} {testName}
                </CardTitle>
                {testData.endpoint && (
                  <CardDescription>Endpoint: {testData.endpoint}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-2">
                  <strong>Status:</strong> {testData.status}
                </div>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  {JSON.stringify(testData.data || testData.error, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

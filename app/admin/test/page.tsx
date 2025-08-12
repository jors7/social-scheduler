'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  FileText
} from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: any
  error?: string
}

export default function AdminTestPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'User Stats API', status: 'pending' },
    { name: 'Audit Logs API', status: 'pending' },
    { name: 'Settings API', status: 'pending' },
    { name: 'User Details API', status: 'pending' },
    { name: 'Admin Auth Check', status: 'pending' },
  ])
  const [running, setRunning] = useState(false)

  const runTests = async () => {
    setRunning(true)
    const newTests = [...tests]

    // Test 1: User Stats
    newTests[0].status = 'running'
    setTests([...newTests])
    try {
      const response = await fetch('/api/admin/users?stats=true')
      const data = await response.json()
      newTests[0].status = response.ok ? 'success' : 'error'
      newTests[0].result = data
    } catch (error) {
      newTests[0].status = 'error'
      newTests[0].error = String(error)
    }
    setTests([...newTests])

    // Test 2: Audit Logs
    newTests[1].status = 'running'
    setTests([...newTests])
    try {
      const response = await fetch('/api/admin/audit?stats=true')
      const data = await response.json()
      newTests[1].status = response.ok ? 'success' : 'error'
      newTests[1].result = data
    } catch (error) {
      newTests[1].status = 'error'
      newTests[1].error = String(error)
    }
    setTests([...newTests])

    // Test 3: Settings
    newTests[2].status = 'running'
    setTests([...newTests])
    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()
      newTests[2].status = response.ok ? 'success' : 'error'
      newTests[2].result = Object.keys(data).length + ' settings loaded'
    } catch (error) {
      newTests[2].status = 'error'
      newTests[2].error = String(error)
    }
    setTests([...newTests])

    // Test 4: User Details (using your own ID)
    newTests[3].status = 'running'
    setTests([...newTests])
    try {
      // First get current user
      const userResponse = await fetch('/api/admin/users?page=1&limit=1')
      const userData = await userResponse.json()
      if (userData.users && userData.users.length > 0) {
        const userId = userData.users[0].id
        const response = await fetch(`/api/admin/users/${userId}`)
        const data = await response.json()
        newTests[3].status = response.ok ? 'success' : 'error'
        newTests[3].result = { email: data.email, role: data.role }
      } else {
        newTests[3].status = 'error'
        newTests[3].error = 'No users found'
      }
    } catch (error) {
      newTests[3].status = 'error'
      newTests[3].error = String(error)
    }
    setTests([...newTests])

    // Test 5: Admin Auth
    newTests[4].status = 'running'
    setTests([...newTests])
    try {
      const response = await fetch('/api/admin/test-audit')
      const data = await response.json()
      newTests[4].status = response.ok ? 'success' : 'error'
      newTests[4].result = data.test_successful ? 'Admin authenticated' : 'Auth failed'
    } catch (error) {
      newTests[4].status = 'error'
      newTests[4].error = String(error)
    }
    setTests([...newTests])

    setRunning(false)
    
    const successCount = newTests.filter(t => t.status === 'success').length
    if (successCount === newTests.length) {
      toast.success(`All ${successCount} tests passed!`)
    } else {
      toast.warning(`${successCount} of ${newTests.length} tests passed`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'running':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin API Tests</h2>
          <p className="text-muted-foreground">
            Test all admin API endpoints and features
          </p>
        </div>
        <Button onClick={runTests} disabled={running}>
          {running ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run All Tests
        </Button>
      </div>

      <div className="grid gap-4">
        {tests.map((test, index) => (
          <Card key={index} className={getStatusColor(test.status)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  {getStatusIcon(test.status)}
                  <span className="ml-2">{test.name}</span>
                </CardTitle>
              </div>
            </CardHeader>
            {(test.result || test.error) && (
              <CardContent>
                {test.result && (
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(test.result, null, 2)}
                  </pre>
                )}
                {test.error && (
                  <p className="text-sm text-red-600">{test.error}</p>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Manual Console Tests
          </CardTitle>
          <CardDescription>
            Copy these commands to test in browser console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Test User Stats:</p>
            <code className="block bg-gray-100 p-2 rounded text-xs">
              fetch('/api/admin/users?stats=true').then(r => r.json()).then(console.log)
            </code>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Test Audit Logs:</p>
            <code className="block bg-gray-100 p-2 rounded text-xs">
              fetch('/api/admin/audit?page=1&limit=10').then(r => r.json()).then(console.log)
            </code>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Test Settings:</p>
            <code className="block bg-gray-100 p-2 rounded text-xs">
              fetch('/api/admin/settings').then(r => r.json()).then(console.log)
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
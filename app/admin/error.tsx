'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Admin dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Admin Dashboard Error</h2>
      <p className="text-gray-600 mb-4 text-center max-w-md">
        {error.message || 'Something went wrong loading the admin dashboard.'}
      </p>
      <div className="space-y-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Back to Dashboard
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-4 bg-gray-100 rounded max-w-2xl overflow-auto">
          <summary className="cursor-pointer font-semibold">Error Details</summary>
          <pre className="mt-2 text-xs">{error.stack}</pre>
        </details>
      )}
    </div>
  )
}
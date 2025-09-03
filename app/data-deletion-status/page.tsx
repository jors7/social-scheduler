'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'

function DataDeletionStatusContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Data Deletion Status
          </CardTitle>
          <CardDescription>
            Instagram Data Deletion Request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {code ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-green-900">
                      Data Deletion Confirmed
                    </p>
                    <p className="text-sm text-green-700">
                      Your Instagram data has been deleted from SocialCal.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Confirmation Code:
                </p>
                <code className="block p-2 bg-white border border-gray-300 rounded text-xs font-mono break-all">
                  {code}
                </code>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p className="font-medium">What was deleted:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>Your Instagram account connection</li>
                  <li>Any scheduled posts for Instagram</li>
                  <li>Your Instagram access tokens</li>
                  <li>Associated Instagram profile data</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm text-blue-700">
                      This data has been permanently removed and cannot be recovered.
                      If you want to use Instagram with SocialCal again, you&apos;ll need to reconnect your account.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-yellow-900">
                      No Confirmation Code Provided
                    </p>
                    <p className="text-sm text-yellow-700">
                      Please use the link provided by Instagram with your confirmation code.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  If you want to delete your data from SocialCal:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-500">
                  <li>Go to your Instagram settings</li>
                  <li>Navigate to &quot;Apps and Websites&quot;</li>
                  <li>Remove SocialCal from your connected apps</li>
                  <li>You&apos;ll receive a confirmation code</li>
                  <li>Return here with that code</li>
                </ol>
              </div>
            </>
          )}

          <div className="pt-4 space-y-2">
            <Link href="/">
              <Button variant="outline" className="w-full">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DataDeletionStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <DataDeletionStatusContent />
    </Suspense>
  )
}
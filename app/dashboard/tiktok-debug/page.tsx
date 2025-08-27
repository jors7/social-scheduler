'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createBrowserClient } from '@supabase/ssr'

export default function TikTokDebugPage() {
  const [publishId, setPublishId] = useState('')
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [account, setAccount] = useState<any>(null)
  const [polling, setPolling] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const loadAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('is_active', true)
      .single()

    if (data) {
      setAccount(data)
      toast.success('TikTok account loaded')
    } else {
      toast.error('No TikTok account connected')
    }
  }

  const checkStatus = async () => {
    if (!publishId) {
      toast.error('Please enter a publish ID')
      return
    }

    if (!account) {
      await loadAccount()
      if (!account) return
    }

    setChecking(true)
    try {
      const response = await fetch('/api/post/tiktok/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: account.access_token,
          publishId: publishId.trim()
        })
      })

      const data = await response.json()
      setStatus(data)
      
      if (data.success) {
        toast.success(`Status: ${data.message}`)
        
        // Show additional info if available
        if (data.publiclyAvailablePostId) {
          toast.info(`Post ID: ${data.publiclyAvailablePostId}`)
        }
        if (data.errorMessage) {
          toast.error(`Error: ${data.errorMessage}`)
        }
      } else {
        toast.error(data.error || 'Failed to check status')
      }
      
      return data
    } catch (error) {
      toast.error('Failed to check status')
      console.error(error)
      return null
    } finally {
      setChecking(false)
    }
  }

  const startPolling = async () => {
    if (!publishId || !account) {
      toast.error('Please enter publish ID and load account first')
      return
    }

    setPolling(true)
    setPollCount(0)
    toast.info('Starting to poll status every 5 seconds...')

    const pollInterval = setInterval(async () => {
      setPollCount(prev => {
        const newCount = prev + 1
        if (newCount >= 24) { // Stop after 2 minutes (24 * 5 seconds)
          clearInterval(pollInterval)
          setPolling(false)
          toast.warning('Polling stopped after 2 minutes')
          return prev
        }
        return newCount
      })

      const result = await checkStatus()
      
      // Stop polling if we get a final status
      if (result && ['PUBLISH_COMPLETE', 'FAILED'].includes(result.status)) {
        clearInterval(pollInterval)
        setPolling(false)
        
        if (result.status === 'PUBLISH_COMPLETE') {
          toast.success('🎉 Video published! Check TikTok app now.')
        } else {
          toast.error('❌ Upload failed. Check details below.')
        }
      }
    }, 5000)

    // Store interval ID for cleanup
    return () => clearInterval(pollInterval)
  }

  const testVideoAccess = async () => {
    // Get the last video URL from console/localStorage
    const videoUrl = prompt('Enter the proxy video URL from console:')
    if (!videoUrl) return

    try {
      const response = await fetch(videoUrl, { method: 'HEAD' })
      if (response.ok) {
        toast.success('✅ Video is accessible!')
        console.log('Video headers:', Object.fromEntries(response.headers.entries()))
      } else {
        toast.error(`❌ Video not accessible: ${response.status}`)
      }
    } catch (error) {
      toast.error('Failed to access video')
      console.error(error)
    }
  }

  const checkLatestPost = async () => {
    if (!account) {
      await loadAccount()
      if (!account) return
    }

    try {
      // Try to get user's latest videos
      const response = await fetch('/api/post/tiktok/user-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: account.access_token
        })
      })

      const data = await response.json()
      console.log('User videos:', data)
      
      if (data.videos && data.videos.length > 0) {
        toast.success(`Found ${data.videos.length} videos`)
        setStatus(data)
      } else {
        toast.info('No videos found in your account')
      }
    } catch (error) {
      toast.error('Failed to fetch videos')
      console.error(error)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>TikTok Debug Tool</CardTitle>
          <CardDescription>
            Debug TikTok posting issues and check upload status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Info */}
          <div className="space-y-2">
            <Button onClick={loadAccount} variant="outline">
              Load TikTok Account
            </Button>
            {account && (
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                <p><strong>Username:</strong> {account.username}</p>
                <p><strong>Account ID:</strong> {account.platform_user_id}</p>
                <p><strong>Connected:</strong> {new Date(account.created_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Status Checker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Check Upload Status</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter publish_id (e.g., v2.xxx)"
                value={publishId}
                onChange={(e) => setPublishId(e.target.value)}
              />
              <Button onClick={checkStatus} disabled={checking || polling}>
                {checking ? 'Checking...' : 'Check Status'}
              </Button>
              <Button onClick={startPolling} disabled={polling} variant="outline">
                {polling ? `Polling... (${pollCount}/24)` : 'Auto Poll'}
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              Find the publish_id in browser console after posting
            </p>
          </div>

          {/* Test Tools */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Debug Tools</label>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={testVideoAccess} variant="outline" size="sm">
                Test Video URL Access
              </Button>
              <Button onClick={checkLatestPost} variant="outline" size="sm">
                Check Latest Videos
              </Button>
            </div>
          </div>

          {/* Status Display */}
          {status && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">Response:</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(status, null, 2)}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-900 mb-2">Debug Steps:</h4>
            <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
              <li>Post a video to TikTok from the dashboard</li>
              <li>Look in browser console for &quot;TikTok publish ID: v2.xxx&quot;</li>
              <li>Copy that ID and paste it above to check status</li>
              <li>Status should be: DOWNLOAD_IN_PROGRESS → PROCESSING → PUBLISH_COMPLETE</li>
              <li>If PUBLISH_COMPLETE, check TikTok app Drafts</li>
            </ol>
          </div>

          {/* Common Issues */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Common Status Meanings:</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>DOWNLOAD_IN_PROGRESS:</strong> TikTok is downloading your video</li>
              <li>• <strong>PROCESSING:</strong> Video is being processed</li>
              <li>• <strong>PUBLISH_COMPLETE:</strong> Video should be in drafts</li>
              <li>• <strong>FAILED:</strong> Something went wrong (check video format)</li>
              <li>• <strong>No response:</strong> Invalid publish_id or token expired</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
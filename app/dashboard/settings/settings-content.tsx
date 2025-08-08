'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus,
  X,
  Link2,
  Bell,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SocialAccount {
  id: string
  platform: string
  platform_user_id: string
  account_name: string
  username: string
  profile_image_url?: string
  is_active: boolean
}

const settingsSections = [
  { id: 'accounts', label: 'Social Media Accounts', icon: Link2 },
  { id: 'notifications', label: 'Post Notifications', icon: Bell },
]

export default function SettingsContent() {
  const [activeSection, setActiveSection] = useState('accounts')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([])
  const [showBlueskyDialog, setShowBlueskyDialog] = useState(false)
  const [blueskyCredentials, setBlueskyCredentials] = useState({
    identifier: '', // handle or email
    password: ''    // app password
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchConnectedAccounts = useCallback(async (showSuccessToast = false) => {
    setRefreshing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error
      console.log('Fetched connected accounts:', data)
      setConnectedAccounts(data || [])
      if (showSuccessToast) {
        toast.success('Accounts refreshed')
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error)
      toast.error('Failed to load connected accounts')
    } finally {
      setRefreshing(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchConnectedAccounts()
    
    // Handle success/error messages from OAuth callback
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success === 'twitter_connected') {
      toast.success('Twitter account connected successfully!')
      router.replace('/dashboard/settings')
    } else if (success === 'bluesky_connected') {
      toast.success('Bluesky account connected successfully!')
      router.replace('/dashboard/settings')
    } else if (success === 'threads_connected') {
      toast.success('Threads account connected successfully!')
      router.replace('/dashboard/settings')
    } else if (success === 'instagram_connected') {
      toast.success('Instagram account connected successfully!')
      router.replace('/dashboard/settings')
    } else if (success === 'facebook_connected') {
      toast.success('Facebook page connected successfully!')
      router.replace('/dashboard/settings')
    } else if (success === 'pinterest_connected') {
      toast.success('Pinterest account connected successfully!')
      router.replace('/dashboard/settings')
    } else if (error) {
      const errorMessages: Record<string, string> = {
        twitter_auth_failed: 'Twitter authentication failed. Please try again.',
        twitter_session_expired: 'Authentication session expired. Please try again.',
        unauthorized: 'You must be logged in to connect social accounts.',
        database_error: 'Failed to save account information. Please try again.',
        twitter_callback_failed: 'Failed to complete Twitter authentication.',
        threads_auth_failed: 'Threads authentication failed. Please try again.',
        threads_callback_failed: 'Failed to complete Threads authentication.',
        instagram_auth_failed: 'Instagram authentication failed. Please try again.',
        instagram_callback_failed: 'Failed to complete Instagram authentication.',
        instagram_no_pages: 'No Facebook pages found. Please create a Facebook page first.',
        instagram_not_connected: 'No Instagram account connected to your Facebook page.',
        instagram_not_business: 'Please convert your Instagram account to a Business account.',
        facebook_auth_failed: 'Facebook authentication failed. Please try again.',
        facebook_callback_failed: 'Failed to complete Facebook authentication.',
      }
      toast.error(errorMessages[error] || 'An error occurred. Please try again.')
      router.replace('/dashboard/settings')
    }
  }, [searchParams, router])

  const handleConnect = async (platformId: string) => {
    console.log('Connect button clicked for:', platformId)
    if (platformId === 'twitter') {
      setLoading(true)
      try {
        console.log('Fetching Twitter auth URL...')
        const response = await fetch('/api/auth/twitter')
        console.log('Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', errorText)
          toast.error(`Failed to connect: ${response.status}`)
          return
        }
        
        const data = await response.json()
        console.log('Response data:', data)
        
        if (data.authUrl) {
          console.log('Redirecting to:', data.authUrl)
          // Open Twitter auth in a new window and show PIN entry instructions
          const authWindow = window.open(data.authUrl, 'twitter-auth', 'width=600,height=700,scrollbars=yes,resizable=yes')
          
          // Redirect to PIN entry page
          toast.info('After authorizing on Twitter, you\'ll get a PIN code. Come back here to enter it.')
          setTimeout(() => {
            router.push('/twitter-callback')
          }, 2000)
        } else {
          toast.error('Failed to initialize Twitter authentication')
        }
      } catch (error) {
        console.error('Error connecting to Twitter:', error)
        toast.error('Failed to connect to Twitter')
      } finally {
        setLoading(false)
      }
    } else if (platformId === 'bluesky') {
      setShowBlueskyDialog(true)
    } else if (platformId === 'threads') {
      setLoading(true)
      try {
        console.log('Fetching Threads auth URL...')
        const response = await fetch('/api/auth/threads')
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', errorText)
          toast.error(`Failed to connect: ${response.status}`)
          return
        }
        
        const data = await response.json()
        
        if (data.authUrl) {
          console.log('Redirecting to:', data.authUrl)
          window.location.href = data.authUrl
        } else {
          toast.error('Failed to initialize Threads authentication')
        }
      } catch (error) {
        console.error('Error connecting to Threads:', error)
        toast.error('Failed to connect to Threads')
      } finally {
        setLoading(false)
      }
    } else if (platformId === 'instagram') {
      setLoading(true)
      try {
        console.log('Fetching Instagram auth URL...')
        const response = await fetch('/api/auth/instagram')
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', errorText)
          toast.error(`Failed to connect: ${response.status}`)
          return
        }
        
        const data = await response.json()
        
        if (data.authUrl) {
          console.log('Redirecting to:', data.authUrl)
          window.location.href = data.authUrl
        } else {
          toast.error('Failed to initialize Instagram authentication')
        }
      } catch (error) {
        console.error('Error connecting to Instagram:', error)
        toast.error('Failed to connect to Instagram')
      } finally {
        setLoading(false)
      }
    } else if (platformId === 'facebook') {
      setLoading(true)
      try {
        console.log('Fetching Facebook auth URL...')
        const response = await fetch('/api/auth/facebook')
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', errorText)
          toast.error(`Failed to connect: ${response.status}`)
          return
        }
        
        const data = await response.json()
        
        if (data.authUrl) {
          console.log('Redirecting to:', data.authUrl)
          window.location.href = data.authUrl
        } else {
          toast.error('Failed to initialize Facebook authentication')
        }
      } catch (error) {
        console.error('Error connecting to Facebook:', error)
        toast.error('Failed to connect to Facebook')
      } finally {
        setLoading(false)
      }
    } else if (platformId === 'pinterest') {
      setLoading(true)
      try {
        console.log('Connecting Pinterest account...')
        const response = await fetch('/api/auth/pinterest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        const data = await response.json()
        
        if (response.ok) {
          toast.success('Pinterest account connected successfully!')
          fetchConnectedAccounts()
        } else {
          toast.error(data.error || 'Failed to connect Pinterest account')
        }
      } catch (error) {
        console.error('Error connecting to Pinterest:', error)
        toast.error('Failed to connect to Pinterest')
      } finally {
        setLoading(false)
      }
    } else {
      toast.info(`${platformId} integration coming soon!`)
    }
  }

  const handleBlueskyConnect = async () => {
    if (!blueskyCredentials.identifier || !blueskyCredentials.password) {
      toast.error('Please enter both your handle/email and app password')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/bluesky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blueskyCredentials),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Bluesky account connected successfully!')
        setShowBlueskyDialog(false)
        setBlueskyCredentials({ identifier: '', password: '' })
        fetchConnectedAccounts()
      } else {
        toast.error(data.error || 'Failed to connect Bluesky account')
      }
    } catch (error) {
      console.error('Error connecting to Bluesky:', error)
      toast.error('Failed to connect to Bluesky')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (platformId: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${platformId} account?`)) {
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('platform', platformId)

      if (error) throw error

      toast.success(`${platformId} account disconnected`)
      fetchConnectedAccounts()
    } catch (error) {
      console.error('Error disconnecting account:', error)
      toast.error('Failed to disconnect account')
    } finally {
      setLoading(false)
    }
  }

  const socialPlatforms = [
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: '𝕏',
      color: 'bg-black',
      note: 'Free tier: Read-only access'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📷',
      color: 'bg-gradient-to-br from-purple-600 to-pink-500'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'f',
      color: 'bg-blue-600'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'in',
      color: 'bg-blue-700'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: '▶',
      color: 'bg-red-600'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: '♪',
      color: 'bg-black'
    },
    {
      id: 'threads',
      name: 'Threads',
      icon: '@',
      color: 'bg-black'
    },
    {
      id: 'bluesky',
      name: 'Bluesky',
      icon: '🦋',
      color: 'bg-sky-500'
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      icon: 'P',
      color: 'bg-red-700'
    },
  ]

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="mt-8 border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {settingsSections.map(section => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeSection === section.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className="h-5 w-5" />
                {section.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="mt-8 space-y-6">
          {activeSection === 'accounts' && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Connected Social Media Accounts</CardTitle>
                      <CardDescription>
                        Connect your social media accounts to start scheduling posts
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchConnectedAccounts(true)}
                      disabled={refreshing}
                    >
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {socialPlatforms.map(platform => {
                      const connectedAccount = connectedAccounts.find(acc => acc.platform === platform.id)
                      const isConnected = !!connectedAccount
                      
                      return (
                      <div
                        key={platform.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                            platform.color
                          )}>
                            <span className="text-lg">{platform.icon}</span>
                          </div>
                          <div>
                            <p className="font-medium">{platform.name}</p>
                            {isConnected && connectedAccount && (
                              <p className="text-sm text-gray-600">@{connectedAccount.username}</p>
                            )}
                            {platform.note && (
                              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                <AlertCircle className="h-3 w-3" />
                                {platform.note}
                              </p>
                            )}
                          </div>
                        </div>
                        {isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(platform.id)}
                            className="text-red-600 hover:text-red-700"
                            disabled={loading}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(platform.id)}
                            disabled={loading}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Connect
                          </Button>
                        )}
                      </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Access</CardTitle>
                  <CardDescription>
                    Generate API keys to integrate with external tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline">
                    Generate API Key
                  </Button>
                </CardContent>
              </Card>
            </>
          )}


          {activeSection === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Enabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Post Reminders</p>
                      <p className="text-sm text-gray-600">Get notified before scheduled posts</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Enabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Reports</p>
                      <p className="text-sm text-gray-600">Receive weekly performance summaries</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Disabled
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

      </div>

      {/* Bluesky Connection Dialog */}
      <Dialog open={showBlueskyDialog} onOpenChange={setShowBlueskyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Bluesky Account</DialogTitle>
            <DialogDescription>
              Enter your Bluesky credentials to connect your account. We recommend using an app password instead of your main password.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bluesky-identifier">Handle or Email</Label>
              <Input
                id="bluesky-identifier"
                type="text"
                placeholder="your-handle.bsky.social or email@example.com"
                value={blueskyCredentials.identifier}
                onChange={(e) => setBlueskyCredentials(prev => ({
                  ...prev,
                  identifier: e.target.value
                }))}
              />
            </div>
            
            <div>
              <Label htmlFor="bluesky-password">App Password</Label>
              <Input
                id="bluesky-password"
                type="password"
                placeholder="App password (not your main password)"
                value={blueskyCredentials.password}
                onChange={(e) => setBlueskyCredentials(prev => ({
                  ...prev,
                  password: e.target.value
                }))}
              />
              <p className="text-xs text-gray-600 mt-1">
                Create an app password at: bsky.app/settings/app-passwords
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBlueskyDialog(false)
                setBlueskyCredentials({ identifier: '', password: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlueskyConnect}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
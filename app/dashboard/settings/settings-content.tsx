'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus,
  Check,
  X,
  Link2,
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  HelpCircle,
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
  { id: 'accounts', label: 'Connected Accounts', icon: Link2 },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
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

  const fetchConnectedAccounts = useCallback(async () => {
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
      toast.success('Accounts refreshed')
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
  }, [searchParams, router, fetchConnectedAccounts])

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
    <div className="max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 mt-8">
        {/* Sidebar Navigation */}
        <Card className="h-fit">
          <CardContent className="p-2">
            {settingsSections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeSection === section.id
                      ? "bg-primary text-white"
                      : "hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
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
                      onClick={fetchConnectedAccounts}
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

          {activeSection === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@example.com" />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" defaultValue="Acme Inc." />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
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

          {activeSection === 'billing' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    You are currently on the Professional plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold">$49/month</p>
                      <p className="text-sm text-gray-600">Billed monthly</p>
                    </div>
                    <Button variant="outline">Change Plan</Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Up to 10 social accounts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Unlimited scheduled posts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Advanced analytics</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>
                    Manage your payment information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-gray-600">Expires 12/25</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
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
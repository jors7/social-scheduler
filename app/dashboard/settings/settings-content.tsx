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
  AlertCircle,
  Clock,
  BarChart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
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
  account_label?: string
  is_primary?: boolean
  display_order?: number
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
  const [accountLimits, setAccountLimits] = useState<{ maxAccounts: number; currentCount: number; canAddMore: boolean } | null>(null)
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>([])
  const [showBlueskyDialog, setShowBlueskyDialog] = useState(false)
  const [blueskyCredentials, setBlueskyCredentials] = useState({
    identifier: '', // handle or email
    password: ''    // app password
  })
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const fetchAccountLimits = async (userId: string) => {
    try {
      // Get current count
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
      
      const currentCount = accounts?.length || 0
      
      // Get subscription limits
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`
          subscription_plans!inner(
            limits
          )
        `)
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .single()
      
      let maxAccounts = 1 // Free plan default
      
      if (subscription && subscription.subscription_plans) {
        const plans = subscription.subscription_plans as any
        const limits = Array.isArray(plans) ? plans[0]?.limits : plans.limits
        maxAccounts = limits?.connected_accounts || 1
      } else {
        // Get free plan limits
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('limits')
          .eq('id', 'free')
          .single()
        
        if (freePlan) {
          const limits = freePlan.limits as any
          maxAccounts = limits?.connected_accounts || 1
        }
      }
      
      const isUnlimited = maxAccounts === -1
      
      setAccountLimits({
        maxAccounts: isUnlimited ? Infinity : maxAccounts,
        currentCount,
        canAddMore: isUnlimited || currentCount < maxAccounts
      })
    } catch (error) {
      console.error('Error fetching account limits:', error)
    }
  }

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
        .order('platform', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      console.log('Fetched connected accounts:', data)
      setConnectedAccounts(data || [])
      
      // Fetch account limits
      await fetchAccountLimits(user.id)
      
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
    // Fetch accounts on mount
    fetchConnectedAccounts()
  }, [])

  const handleConnect = async (platformId: string) => {
    console.log('Connect button clicked for:', platformId)
    
    // Check account limits
    if (accountLimits && !accountLimits.canAddMore) {
      toast.error(`Account limit reached. Your plan allows ${accountLimits.maxAccounts} social account(s).`)
      return
    }
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

  const handleDisconnect = async (accountId: string, platformName?: string) => {
    if (!confirm(`Are you sure you want to disconnect this ${platformName || 'social'} account?`)) {
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .eq('id', accountId)
        .eq('user_id', user.id)

      if (error) throw error

      toast.success(`Account disconnected`)
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
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="flex p-2 gap-2" role="tablist">
          {settingsSections.map(section => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                role="tab"
                aria-selected={activeSection === section.id}
                aria-controls={`${section.id}-panel`}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200",
                  activeSection === section.id
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md transform scale-105"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className={cn(
                  "p-1 rounded-lg",
                  activeSection === section.id
                    ? "bg-white/20"
                    : "bg-gray-100"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                {section.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-8 space-y-6">
          {activeSection === 'accounts' && (
            <div id="accounts-panel" role="tabpanel" aria-labelledby="accounts-tab">
              <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                          <Link2 className="h-5 w-5 text-white" />
                        </div>
                        Connected Social Media Accounts
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Connect your social media accounts to start scheduling posts
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchConnectedAccounts(true)}
                      disabled={refreshing}
                      className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    >
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Account Limits Display */}
                  {accountLimits && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Link2 className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Connected Accounts
                            </p>
                            <p className="text-xs text-gray-600">
                              {accountLimits.currentCount} of {accountLimits.maxAccounts === Infinity ? 'Unlimited' : accountLimits.maxAccounts} accounts used
                            </p>
                          </div>
                        </div>
                        {accountLimits.maxAccounts !== Infinity && (
                          <div className="text-right">
                            <p className="text-xs text-gray-600">
                              {accountLimits.canAddMore 
                                ? `${accountLimits.maxAccounts - accountLimits.currentCount} slots remaining`
                                : 'Limit reached'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {socialPlatforms.map(platform => {
                      const platformAccounts = connectedAccounts.filter(acc => acc.platform === platform.id)
                      const hasAccounts = platformAccounts.length > 0
                      const isExpanded = expandedPlatforms.includes(platform.id)
                      
                      return (
                      <div key={platform.id} className="border rounded-xl overflow-hidden">
                        <div
                          className={cn(
                            "p-4 transition-all duration-200",
                            hasAccounts 
                              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" 
                              : "bg-gray-50 hover:bg-gray-100"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md",
                                platform.color
                              )}>
                                <span className="text-xl">{platform.icon}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{platform.name}</p>
                                {hasAccounts && (
                                  <p className="text-sm text-gray-600">
                                    {platformAccounts.length} account{platformAccounts.length !== 1 ? 's' : ''} connected
                                  </p>
                                )}
                                {platform.note && (
                                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {platform.note}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasAccounts && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setExpandedPlatforms(prev => 
                                      prev.includes(platform.id) 
                                        ? prev.filter(p => p !== platform.id)
                                        : [...prev, platform.id]
                                    )
                                  }}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  {isExpanded ? 'Hide' : 'Show'} Accounts
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleConnect(platform.id)}
                                disabled={loading || (!!accountLimits && !accountLimits.canAddMore)}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg"
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                Add Account
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Account List */}
                        {hasAccounts && isExpanded && (
                          <div className="border-t bg-white p-4 space-y-2">
                            {platformAccounts.map((account, index) => (
                              <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-900">
                                      {account.account_label || account.username || account.account_name || `Account ${index + 1}`}
                                    </span>
                                    {account.username && (
                                      <span className="text-gray-600 ml-2">@{account.username}</span>
                                    )}
                                    {account.is_primary && (
                                      <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {account.is_primary !== true && platformAccounts.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          // This will only work if the migration has been applied
                                          const { error } = await supabase
                                            .from('social_accounts')
                                            .update({ is_primary: true })
                                            .eq('id', account.id)
                                          
                                          if (error) {
                                            console.error('Error setting primary:', error)
                                            toast.error('This feature requires database migration')
                                          } else {
                                            toast.success('Set as primary account')
                                            fetchConnectedAccounts()
                                          }
                                        } catch (error) {
                                          toast.error('Failed to update account')
                                        }
                                      }}
                                      className="text-xs"
                                    >
                                      Set as Primary
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDisconnect(account.id, platform.name)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                                    disabled={loading}
                                  >
                                    <X className="mr-1 h-3 w-3" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    API Access
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Generate API keys to integrate with external tools
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    Generate API Key
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}


          {activeSection === 'notifications' && (
            <div id="notifications-panel" role="tabpanel" aria-labelledby="notifications-tab">
            <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  Notification Preferences
                </CardTitle>
                <CardDescription className="mt-2">
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Bell className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-600">Receive updates via email</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toast.info('Email notifications coming soon!')}
                      className="hover:bg-gray-100"
                    >
                      Disabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Clock className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Post Reminders</p>
                        <p className="text-sm text-gray-600">Get notified before scheduled posts</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toast.info('Post reminders coming soon!')}
                      className="hover:bg-gray-100"
                    >
                      Disabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <BarChart className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Weekly Reports</p>
                        <p className="text-sm text-gray-600">Receive weekly performance summaries</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toast.info('Weekly reports coming soon!')}
                      className="hover:bg-gray-100"
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
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
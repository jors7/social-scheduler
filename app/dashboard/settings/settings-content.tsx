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
      console.log('Fetching account limits for user:', userId)
      
      // Get current count
      const { data: accounts, error: accountsError } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
      
      if (accountsError) {
        console.error('Error fetching accounts:', accountsError)
      }
      
      const currentCount = accounts?.length || 0
      console.log('Current account count:', currentCount)
      
      // Get subscription with proper join
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          plan_id,
          status,
          subscription_plans (
            id,
            name,
            limits
          )
        `)
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .single()
      
      if (subError) {
        console.error('Error fetching subscription:', subError)
      }
      
      console.log('Subscription data:', subscription)
      
      let maxAccounts = 1 // Free plan default
      let planName = 'Free'
      
      if (subscription && subscription.subscription_plans) {
        const plan = subscription.subscription_plans as any
        const limits = plan.limits as any
        planName = plan.name || planName
        
        // Check for unlimited (-1) or get the actual limit
        if (limits?.connected_accounts === -1) {
          maxAccounts = -1 // Keep as -1 for unlimited
        } else {
          maxAccounts = limits?.connected_accounts || 1
        }
        
        console.log(`Plan: ${planName}, Connected accounts limit:`, limits?.connected_accounts)
      } else {
        // Get free plan limits as fallback
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
      
      console.log('Setting account limits:', {
        maxAccounts: isUnlimited ? 'Unlimited' : maxAccounts,
        currentCount,
        canAddMore: isUnlimited || currentCount < maxAccounts
      })
      
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
    // Check for error messages in URL
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    
    if (error === 'threads_wrong_account') {
      toast.error('Wrong Threads account detected. Please log out of Threads in your browser and try again.')
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (error === 'threads_auth_failed') {
      toast.error('Threads authentication failed. Please try again.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    // Fetch accounts on mount and set up real-time subscription
    const initialize = async () => {
      await fetchConnectedAccounts()
      
      // Get user for subscription setup
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Subscribe to subscription changes to update limits in real-time
      const channel = supabase
        .channel('settings-subscription-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('Subscription changed:', payload)
            // Refetch limits when subscription changes
            await fetchAccountLimits(user.id)
          }
        )
        .subscribe()
      
      // Cleanup subscription on unmount
      return () => {
        channel.unsubscribe()
      }
    }
    
    initialize()
  }, [fetchConnectedAccounts])

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
        // First deauthorize any existing connections to ensure clean state
        await fetch('/api/auth/threads/deauthorize', { method: 'POST' })
        
        // Use the clean route to ensure fresh authorization
        const response = await fetch('/api/auth/threads-clean')
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', errorText)
          toast.error(`Failed to connect: ${response.status}`)
          return
        }
        
        const data = await response.json()
        
        if (data.authUrl) {
          console.log('Clean auth URL received:', data.authUrl)
          if (data.cleared) {
            toast.info('Clearing previous account data...')
          }
          // Direct redirect to Threads OAuth (not Instagram)
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
      // Facebook integration temporarily disabled
      toast.info('Facebook integration is currently being rebuilt. Please check back soon.')
    } else if (platformId === 'pinterest') {
      setLoading(true)
      try {
        console.log('Initiating Pinterest OAuth...')
        const response = await fetch('/api/auth/pinterest', {
          method: 'GET',
        })
        
        const data = await response.json()
        
        if (response.ok && data.authUrl) {
          // Redirect to Pinterest OAuth
          window.location.href = data.authUrl
        } else {
          toast.error(data.error || 'Failed to connect Pinterest account')
        }
      } catch (error) {
        console.error('Error connecting to Pinterest:', error)
        toast.error('Failed to connect to Pinterest')
      } finally {
        setLoading(false)
      }
    } else if (platformId === 'linkedin') {
      setLoading(true)
      try {
        console.log('Initiating LinkedIn OAuth...')
        const response = await fetch('/api/auth/linkedin', {
          method: 'GET',
        })
        
        const data = await response.json()
        
        if (response.ok && data.authUrl) {
          // Redirect to LinkedIn OAuth
          window.location.href = data.authUrl
        } else {
          toast.error(data.error || 'Failed to connect LinkedIn account')
        }
      } catch (error) {
        console.error('Error connecting to LinkedIn:', error)
        toast.error('Failed to connect to LinkedIn')
      } finally {
        setLoading(false)
      }
    } else if (platformId === 'youtube') {
      setLoading(true)
      try {
        console.log('Initiating YouTube OAuth...')
        const response = await fetch('/api/auth/youtube', {
          method: 'GET',
        })
        
        const data = await response.json()
        
        if (response.ok && data.authUrl) {
          // Redirect to YouTube OAuth
          window.location.href = data.authUrl
        } else {
          toast.error(data.error || 'Failed to connect YouTube account')
        }
      } catch (error) {
        console.error('Error connecting to YouTube:', error)
        toast.error('Failed to connect to YouTube')
      } finally {
        setLoading(false)
      }
    } else if (platformId === 'tiktok') {
      setLoading(true)
      try {
        console.log('Initiating TikTok OAuth...')
        const response = await fetch('/api/auth/tiktok', {
          method: 'GET',
        })
        
        const data = await response.json()
        
        if (response.ok && data.authUrl) {
          // Redirect to TikTok OAuth
          window.location.href = data.authUrl
        } else {
          toast.error(data.error || 'Failed to connect TikTok account')
        }
      } catch (error) {
        console.error('Error connecting to TikTok:', error)
        toast.error('Failed to connect to TikTok')
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

      // Handle platform-specific disconnection
      if (platformName === 'Threads') {
        // For Threads, call the disconnect endpoint to clear cookies
        await fetch('/api/auth/threads/disconnect', { method: 'POST' })
      } else if (platformName === 'Instagram') {
        // For Instagram, call the disconnect endpoint to revoke permissions
        console.log('Calling Instagram disconnect endpoint...')
        const response = await fetch('/api/auth/instagram/disconnect', { method: 'POST' })
        const result = await response.json()
        console.log('Instagram disconnect result:', result)
        if (!response.ok) {
          console.error('Failed to revoke Instagram permissions:', result)
          throw new Error(result.error || 'Failed to disconnect Instagram')
        } else if (result.revokeSuccess) {
          console.log('✅ Instagram permissions successfully revoked')
        } else {
          console.warn('⚠️ Instagram local data cleared but revoke may have failed:', result.note)
        }
        // Instagram disconnect endpoint handles database deletion, so we're done
      } else {
        // For other platforms, just delete the record
        // Delete the record entirely for better security
        // The account can be re-added with upsert when reconnecting
        const { error } = await supabase
          .from('social_accounts')
          .delete()
          .eq('id', accountId)
          .eq('user_id', user.id)

        if (error) throw error
      }

      toast.success(`Account disconnected`)
      
      // Show additional guidance for platforms that maintain authorization
      if (platformName && ['Threads', 'TikTok', 'Facebook', 'Instagram', 'YouTube', 'LinkedIn'].includes(platformName)) {
        toast.info(
          `To fully revoke ${platformName} access, visit your ${platformName} account settings`, 
          { duration: 5000 }
        )
      }
      
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
        <div className="flex p-2 gap-1 sm:gap-2 overflow-x-auto scrollbar-thin" role="tablist">
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
                  "flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap flex-shrink-0",
                  activeSection === section.id
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md transform sm:scale-105"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className={cn(
                  "p-0.5 sm:p-1 rounded-lg",
                  activeSection === section.id
                    ? "bg-white/20"
                    : "bg-gray-100"
                )}>
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
                <span className="hidden sm:inline">{section.label}</span>
                <span className="sm:hidden">{section.label}</span>
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
                <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-xl flex items-center gap-2">
                        <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                          <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <span className="line-clamp-1">Connected Social Media Accounts</span>
                      </CardTitle>
                      <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
                        Connect your social media accounts to start scheduling posts
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchConnectedAccounts(true)}
                      disabled={refreshing}
                      className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-xs sm:text-sm self-end sm:self-auto"
                    >
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {/* Account Limits Display */}
                  {accountLimits && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
                            <Link2 className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-gray-900">
                              Connected Accounts
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-600">
                              {accountLimits.currentCount} of {accountLimits.maxAccounts === Infinity ? 'unlimited' : accountLimits.maxAccounts} accounts used
                            </p>
                          </div>
                        </div>
                        {accountLimits.maxAccounts !== Infinity && (
                          <div className="text-right">
                            <p className="text-[10px] sm:text-xs text-gray-600">
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
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0",
                                platform.color
                              )}>
                                <span className="text-lg sm:text-xl">{platform.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm sm:text-base">{platform.name}</p>
                                {hasAccounts && (
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    {platformAccounts.length} account{platformAccounts.length !== 1 ? 's' : ''} connected
                                  </p>
                                )}
                                {platform.note && (
                                  <p className="text-[10px] sm:text-xs text-amber-600 flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                                    <span className="line-clamp-2">{platform.note}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
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
                                  className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  {isExpanded ? 'Hide' : 'Show'} Accounts
                                </Button>
                              )}
                              {platform.id === 'threads' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => router.push('/threads-logout')}
                                  className="text-xs text-blue-600 hover:text-blue-700 mr-2"
                                >
                                  Having issues?
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleConnect(platform.id)}
                                disabled={loading || (!!accountLimits && !accountLimits.canAddMore)}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg text-xs sm:text-sm px-3 sm:px-4"
                              >
                                <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Add Account</span>
                                <span className="sm:hidden">Add</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Account List */}
                        {hasAccounts && isExpanded && (
                          <div className="border-t bg-white p-3 sm:p-4 space-y-2">
                            {platformAccounts.map((account, index) => (
                              <div key={account.id} className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="text-xs sm:text-sm">
                                      <span className="font-medium text-gray-900 block sm:inline">
                                        {account.account_label || account.username || account.account_name || `Account ${index + 1}`}
                                      </span>
                                      {account.username && (
                                        <span className="text-gray-600 block sm:inline sm:ml-2 text-[11px] sm:text-xs">@{account.username}</span>
                                      )}
                                      {account.is_primary && (
                                        <span className="inline-block mt-1 sm:mt-0 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-purple-100 text-purple-700 rounded-full">
                                          Primary
                                        </span>
                                      )}
                                      {/* Check if token is expired for Threads */}
                                      {platform.id === 'threads' && (account as any).expires_at && new Date((account as any).expires_at) < new Date() && (
                                        <span className="inline-block mt-1 sm:mt-0 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-red-100 text-red-700 rounded-full">
                                          Token Expired - Reconnect Required
                                        </span>
                                      )}
                                      {/* Check if Facebook page needs setup */}
                                      {platform.id === 'facebook' && account.platform_user_id === 'PENDING_SETUP' && (
                                        <span className="inline-block mt-1 sm:mt-0 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-amber-100 text-amber-700 rounded-full">
                                          Page Setup Required
                                        </span>
                                      )}
                                      {/* Check if Facebook page was force-saved */}
                                      {platform.id === 'facebook' && (account as any).metadata?.forcedSave && (
                                        <span className="inline-block mt-1 sm:mt-0 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-orange-100 text-orange-700 rounded-full">
                                          ⚠️ Unverified Page
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto">
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
              <div className="pb-12"></div>
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
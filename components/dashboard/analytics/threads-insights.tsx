'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Repeat2, 
  Quote, 
  Eye, 
  Users, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Info,
  AtSign
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ThreadsMetrics {
  views: number
  likes: number
  replies: number
  reposts: number
  quotes: number
  shares: number
}

interface ThreadsPost {
  id: string
  text: string
  permalink?: string
  timestamp: string
  media_type?: string
  media_url?: string
  metrics?: ThreadsMetrics
}

interface ThreadsInsightsProps {
  className?: string
}

export function ThreadsInsights({ className }: ThreadsInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [userInsights, setUserInsights] = useState<any>(null)
  const [recentPosts, setRecentPosts] = useState<ThreadsPost[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'days_28'>('week')
  const [hasThreadsAccount, setHasThreadsAccount] = useState(false)
  const [threadsAccounts, setThreadsAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)

  const fetchThreadsInsights = async (accountId?: string, forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      
      let accountToUse: any = null;
      
      // Check if Threads account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (accountResponse.ok) {
        const accounts = await accountResponse.json()
        const threadsAccountsList = accounts.filter((acc: any) => acc.platform === 'threads' && acc.is_active)
        
        if (threadsAccountsList.length === 0) {
          setHasThreadsAccount(false)
          return
        }
        
        setHasThreadsAccount(true)
        setThreadsAccounts(threadsAccountsList)
        
        // Select account to use - force refresh means we should get fresh account data
        accountToUse = forceRefresh
          ? threadsAccountsList[0]  // Use first account when force refreshing
          : accountId 
          ? threadsAccountsList.find((acc: any) => acc.id === accountId) 
          : selectedAccount 
          || threadsAccountsList[0]
        
        setSelectedAccount(accountToUse)
      } else {
        return
      }

      if (!accountToUse) {
        console.error('No Threads account available')
        return
      }

      // Fetch recent posts directly from Threads API (like Instagram does)
      // This ensures deleted posts don't show up
      const selectedAccountId = accountToUse.id
      const mediaQueryParams = new URLSearchParams({
        limit: '5',
        ...(selectedAccountId && { accountId: selectedAccountId })
      })
      const mediaResponse = await fetch(`/api/threads/media?${mediaQueryParams}`)
      if (mediaResponse.ok) {
        const data = await mediaResponse.json()
        
        // Check if the response indicates a token issue
        if (data.needsReconnect) {
          toast.error('Threads token expired. Please reconnect your account.')
          setTimeout(() => {
            window.location.href = '/dashboard/settings'
          }, 2000)
          return
        }
        
        const { media } = data
        
        // Convert API response to ThreadsPost format
        const threadsPostsData: ThreadsPost[] = media.map((post: any) => ({
          id: post.id,
          text: post.text || '',
          permalink: post.permalink,
          timestamp: post.timestamp,
          metrics: post.metrics || {
            views: 0,
            likes: 0,
            replies: 0,
            reposts: 0,
            quotes: 0,
            shares: 0
          }
        }))
        
        setRecentPosts(threadsPostsData)
      } else {
        const errorData = await mediaResponse.json()
        if (errorData.needsReconnect) {
          toast.error('Threads token expired. Please reconnect your account.')
          setTimeout(() => {
            window.location.href = '/dashboard/settings'
          }, 2000)
          return
        }
        console.error('Failed to fetch Threads media:', errorData)
      }
      
      // Try to fetch user-level insights (may fail without permissions)
      try {
        const insightsQueryParams = new URLSearchParams({
          period: selectedPeriod,
          ...(selectedAccountId && { accountId: selectedAccountId })
        })
        const insightsResponse = await fetch(`/api/threads/insights?${insightsQueryParams}`)
        
        if (insightsResponse.ok) {
          const data = await insightsResponse.json()
          setUserInsights(data.insights)
        }
      } catch (error) {
        console.log('Could not fetch Threads user insights (permission may be missing)')
      }
      
    } catch (error) {
      console.error('Error fetching Threads insights:', error)
      toast.error('Failed to load Threads insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(() => {
      fetchThreadsInsights()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [selectedPeriod])

  const handleRefresh = async () => {
    setRefreshing(true)
    
    // First try to refresh the token if needed
    try {
      const refreshResponse = await fetch('/api/threads/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId: selectedAccount?.id })
      })
      
      if (refreshResponse.ok) {
        const result = await refreshResponse.json()
        console.log('Token refresh result:', result)
        
        if (result.needsReconnect) {
          toast.error('Threads token expired. Please reconnect your account in Settings.')
          setRefreshing(false)
          setTimeout(() => {
            window.location.href = '/dashboard/settings'
          }, 2000)
          return
        }
        
        if (result.summary?.refreshed > 0) {
          toast.success('Token refreshed successfully')
          // Force a complete reload to get the new token
          setSelectedAccount(null)
          setThreadsAccounts([])
          // Wait for token to be saved in database
          await new Promise(resolve => setTimeout(resolve, 1000))
          // Force refresh to get new token
          await fetchThreadsInsights(undefined, true)
          setRefreshing(false)
          return
        }
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
    }
    
    // Then update all Threads post metrics in the database
    try {
      const updateResponse = await fetch('/api/threads/update-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (updateResponse.ok) {
        const result = await updateResponse.json()
        console.log('Updated Threads metrics:', result)
        if (result.updatedCount > 0) {
          toast.success(`Updated metrics for ${result.updatedCount} Threads posts`)
        }
      }
    } catch (error) {
      console.error('Error updating Threads metrics:', error)
    }
    
    // If no token refresh happened, just fetch insights normally
    await fetchThreadsInsights()
  }

  if (!hasThreadsAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5" />
            Threads Insights
          </CardTitle>
          <CardDescription>
            Connect your Threads account to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AtSign className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No Threads account connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect Threads
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && !userInsights && recentPosts.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5" />
            Threads Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const stripHtml = (html: string) => {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }

  const getChangeIndicator = (current: number, previous: number) => {
    if (!previous || previous === 0) return null
    const change = ((current - previous) / previous) * 100
    
    if (change > 0) {
      return (
        <span className="flex items-center text-xs text-green-600">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{change.toFixed(1)}%
        </span>
      )
    } else if (change < 0) {
      return (
        <span className="flex items-center text-xs text-red-600">
          <TrendingDown className="h-3 w-3 mr-1" />
          {change.toFixed(1)}%
        </span>
      )
    }
    return null
  }

  // Calculate total metrics from recent posts
  const totalMetrics = recentPosts.reduce((acc, post) => ({
    views: acc.views + (post.metrics?.views || 0),
    likes: acc.likes + (post.metrics?.likes || 0),
    replies: acc.replies + (post.metrics?.replies || 0),
    reposts: acc.reposts + (post.metrics?.reposts || 0),
    quotes: acc.quotes + (post.metrics?.quotes || 0),
    shares: acc.shares + (post.metrics?.shares || 0)
  }), { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0, shares: 0 })

  return (
    <div className={cn("space-y-6", className)}>
      {/* Account Overview */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black p-0.5">
          <CardHeader className="bg-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-gray-900 to-black rounded-lg text-white">
                    <AtSign className="h-5 w-5" />
                  </div>
                  <span className="bg-gradient-to-r from-gray-900 to-black bg-clip-text text-transparent font-bold">
                    Threads Insights
                  </span>
                  {selectedAccount && (
                    <Badge className="ml-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300">
                      @{selectedAccount.username || selectedAccount.platform_user_id}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {selectedAccount 
                    ? `Analytics for @${selectedAccount.username || selectedAccount.platform_user_id}`
                    : 'Performance metrics for your Threads account'}
                </CardDescription>
                {threadsAccounts.length > 1 && (
                  <div className="mt-2">
                    <select
                      className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                      value={selectedAccount?.id || ''}
                      onChange={(e) => {
                        const account = threadsAccounts.find(acc => acc.id === e.target.value)
                        if (account) {
                          setSelectedAccount(account)
                          fetchThreadsInsights(account.id)
                        }
                      }}
                    >
                      {threadsAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          @{account.username || account.platform_user_id}
                        </option>
                      ))}
                    </select>
                    <span className="ml-2 text-xs text-gray-500">
                      Switch between {threadsAccounts.length} connected accounts
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="text-xs border rounded-lg px-2 py-1"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as any)}
                >
                  <option value="day">Last 24 hours</option>
                  <option value="week">Last 7 days</option>
                  <option value="days_28">Last 28 days</option>
                </select>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh token and data"
                  className="bg-white hover:bg-gray-50"
                >
                  <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                  <span className="sr-only">Refresh</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </div>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Views */}
            <div className="group relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 border border-gray-300 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="absolute top-2 right-2 p-1.5 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg text-white opacity-20 group-hover:opacity-30 transition-opacity">
                <Eye className="h-5 w-5" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Views</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-black bg-clip-text text-transparent">
                  {formatNumber(totalMetrics.views)}
                </p>
              </div>
            </div>

            {/* Likes */}
            <div className="group relative bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="absolute top-2 right-2 p-1.5 bg-gradient-to-br from-red-400 to-pink-400 rounded-lg text-white opacity-20 group-hover:opacity-30 transition-opacity">
                <Heart className="h-5 w-5" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">Likes</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                  {formatNumber(totalMetrics.likes)}
                </p>
              </div>
            </div>

            {/* Replies */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="absolute top-2 right-2 p-1.5 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-lg text-white opacity-20 group-hover:opacity-30 transition-opacity">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Replies</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {formatNumber(totalMetrics.replies)}
                </p>
              </div>
            </div>

            {/* Reposts */}
            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="absolute top-2 right-2 p-1.5 bg-gradient-to-br from-green-400 to-emerald-400 rounded-lg text-white opacity-20 group-hover:opacity-30 transition-opacity">
                <Repeat2 className="h-5 w-5" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Reposts</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {formatNumber(totalMetrics.reposts)}
                </p>
              </div>
            </div>

            {/* Quotes */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="absolute top-2 right-2 p-1.5 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-lg text-white opacity-20 group-hover:opacity-30 transition-opacity">
                <Quote className="h-5 w-5" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Quotes</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {formatNumber(totalMetrics.quotes)}
                </p>
              </div>
            </div>

            {/* Shares */}
            <div className="group relative bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100 hover:shadow-lg transition-all duration-200 hover:scale-105">
              <div className="absolute top-2 right-2 p-1.5 bg-gradient-to-br from-orange-400 to-amber-400 rounded-lg text-white opacity-20 group-hover:opacity-30 transition-opacity">
                <Share2 className="h-5 w-5" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wider mb-1">Shares</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {formatNumber(totalMetrics.shares)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts Performance */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-gray-900 to-black rounded-lg text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-gray-900 to-black bg-clip-text text-transparent font-bold">
              Recent Threads Performance
            </span>
            {selectedAccount && (
              <Badge className="ml-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300">
                @{selectedAccount.username || selectedAccount.platform_user_id}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-gray-600 mt-1">
            Engagement metrics for your latest Threads posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="mx-auto h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">No recent Threads posts available</p>
              <p className="text-xs mt-1">Post content to see performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="group border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200 bg-gradient-to-br from-white to-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 line-clamp-2 font-medium">
                        {stripHtml(post.text).slice(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(post.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    {post.media_type && (
                      <Badge className="ml-2 bg-gradient-to-r from-gray-700 to-black text-white border-0">
                        {post.media_type}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2 border border-gray-200">
                      <div className="flex items-center gap-1 mb-1">
                        <Eye className="h-3 w-3 text-gray-600" />
                        <span className="text-xs text-gray-700 font-medium">Views</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800">{formatNumber(post.metrics?.views || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-2 border border-red-100">
                      <div className="flex items-center gap-1 mb-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">Likes</span>
                      </div>
                      <p className="text-lg font-bold text-red-700">{formatNumber(post.metrics?.likes || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-100">
                      <div className="flex items-center gap-1 mb-1">
                        <MessageCircle className="h-3 w-3 text-blue-500" />
                        <span className="text-xs text-blue-600 font-medium">Replies</span>
                      </div>
                      <p className="text-lg font-bold text-blue-700">{formatNumber(post.metrics?.replies || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 border border-green-100">
                      <div className="flex items-center gap-1 mb-1">
                        <Repeat2 className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">Reposts</span>
                      </div>
                      <p className="text-lg font-bold text-green-700">{formatNumber(post.metrics?.reposts || 0)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Quote className="h-3 w-3 text-purple-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.quotes || 0)}</span>
                      <span className="text-xs text-gray-500">quotes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="h-3 w-3 text-orange-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.shares || 0)}</span>
                      <span className="text-xs text-gray-500">shares</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
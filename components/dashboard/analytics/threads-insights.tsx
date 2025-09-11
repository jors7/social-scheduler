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

  const fetchThreadsInsights = async (accountId?: string) => {
    try {
      setLoading(true)
      
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
        
        // Select account to use
        const accountToUse = accountId 
          ? threadsAccountsList.find((acc: any) => acc.id === accountId) 
          : selectedAccount 
          || threadsAccountsList[0]
        
        setSelectedAccount(accountToUse)
      } else {
        return
      }

      // Fetch recent posts directly from Threads API (like Instagram does)
      // This ensures deleted posts don't show up
      const mediaQueryParams = new URLSearchParams({
        limit: '5',
        ...(selectedAccount?.id && { accountId: selectedAccount.id })
      })
      const mediaResponse = await fetch(`/api/threads/media?${mediaQueryParams}`)
      if (mediaResponse.ok) {
        const { media } = await mediaResponse.json()
        
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
      }
      
      // Try to fetch user-level insights (may fail without permissions)
      try {
        const insightsResponse = await fetch(`/api/threads/insights?period=${selectedPeriod}`, {
          headers: {
            'Authorization': `Bearer ${selectedAccount?.access_token || ''}`
          }
        })
        
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
    
    // First update all Threads post metrics in the database
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
    
    // Then fetch the insights
    fetchThreadsInsights()
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <AtSign className="h-5 w-5" />
                Threads Insights
                {selectedAccount && (
                  <Badge variant="secondary" className="ml-2">
                    @{selectedAccount.username || selectedAccount.platform_user_id}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
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
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Views */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>Views</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.views)}
              </p>
            </div>

            {/* Likes */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4" />
                <span>Likes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.likes)}
              </p>
            </div>

            {/* Replies */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageCircle className="h-4 w-4" />
                <span>Replies</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.replies)}
              </p>
            </div>

            {/* Reposts */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Repeat2 className="h-4 w-4" />
                <span>Reposts</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.reposts)}
              </p>
            </div>

            {/* Quotes */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Quote className="h-4 w-4" />
                <span>Quotes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.quotes)}
              </p>
            </div>

            {/* Shares */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Share2 className="h-4 w-4" />
                <span>Shares</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.shares)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Threads Performance
            {selectedAccount && (
              <Badge variant="outline" className="ml-2 text-xs">
                @{selectedAccount.username || selectedAccount.platform_user_id}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
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
                <div key={post.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {stripHtml(post.text).slice(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(post.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    {post.media_type && (
                      <Badge variant="secondary" className="ml-2">
                        {post.media_type}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-gray-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.views || 0)}</span>
                      <span className="text-xs text-gray-500">views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.likes || 0)}</span>
                      <span className="text-xs text-gray-500">likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-blue-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.replies || 0)}</span>
                      <span className="text-xs text-gray-500">replies</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Repeat2 className="h-3 w-3 text-green-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.reposts || 0)}</span>
                      <span className="text-xs text-gray-500">reposts</span>
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
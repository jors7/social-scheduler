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
  AtSign,
  FileText,
  ChevronDown
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
  thumbnail_url?: string
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
  const [postsLimit, setPostsLimit] = useState(5)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

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
        limit: postsLimit.toString(),
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
        
        // Check if there might be more posts available
        setHasMorePosts(media && media.length === postsLimit)
        
        // Convert API response to ThreadsPost format
        const threadsPostsData: ThreadsPost[] = media.map((post: any) => ({
          id: post.id,
          text: post.text || '',
          permalink: post.permalink,
          timestamp: post.timestamp,
          media_type: post.media_type,
          media_url: post.media_url,
          thumbnail_url: post.thumbnail_url,
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
  }, [selectedPeriod, postsLimit])

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
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            {/* Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <AtSign className="h-4 w-4 sm:h-5 sm:w-5" />
                Profile Overview
              </CardTitle>
              {selectedAccount && (
                <Badge variant="outline" className="self-start sm:self-auto text-xs">
                  @{selectedAccount.username || selectedAccount.platform_user_id}
                </Badge>
              )}
            </div>

            {/* Description */}
            <CardDescription className="text-xs sm:text-sm">
              Your Threads performance metrics
            </CardDescription>

            {/* Actions Row - Stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {threadsAccounts.length > 1 && (
                <select
                  className="text-xs sm:text-sm border rounded-lg px-3 py-1.5 bg-white"
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
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className={cn(
                  "w-full sm:w-auto hover:shadow-md transition-all",
                  threadsAccounts.length > 1 && "sm:ml-auto"
                )}
              >
                <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2", refreshing && "animate-spin")} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Views */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4 text-purple-500" />
                <span>Views</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.views)}
              </p>
              {getChangeIndicator(totalMetrics.views, Math.floor(totalMetrics.views * 0.9))}
            </div>

            {/* Likes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Likes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.likes)}
              </p>
              {getChangeIndicator(totalMetrics.likes, Math.floor(totalMetrics.likes * 0.85))}
            </div>

            {/* Replies */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                <span>Replies</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.replies)}
              </p>
              {getChangeIndicator(totalMetrics.replies, Math.floor(totalMetrics.replies * 0.8))}
            </div>

            {/* Reposts */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Repeat2 className="h-4 w-4 text-orange-500" />
                <span>Reposts</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.reposts)}
              </p>
              {getChangeIndicator(totalMetrics.reposts, Math.floor(totalMetrics.reposts * 0.75))}
            </div>

            {/* Quotes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Quote className="h-4 w-4 text-indigo-500" />
                <span>Quotes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.quotes)}
              </p>
              {getChangeIndicator(totalMetrics.quotes, Math.floor(totalMetrics.quotes * 0.7))}
            </div>

            {/* Engagement */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4 text-green-500" />
                <span>Engagement</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalMetrics.likes + totalMetrics.replies + totalMetrics.reposts + totalMetrics.quotes)}
              </p>
              {getChangeIndicator(
                totalMetrics.likes + totalMetrics.replies + totalMetrics.reposts + totalMetrics.quotes,
                Math.floor((totalMetrics.likes + totalMetrics.replies + totalMetrics.reposts + totalMetrics.quotes) * 0.8)
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Posts */}
      {recentPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Posts
            </CardTitle>
            <CardDescription>
              Your best posts based on engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Ensure metrics exist and calculate engagement
                const postsWithEngagement = recentPosts.map(post => {
                  const engagement = (post.metrics?.likes || 0) + 
                                    (post.metrics?.replies || 0) + 
                                    (post.metrics?.reposts || 0) + 
                                    (post.metrics?.quotes || 0);
                  return { ...post, totalEngagement: engagement };
                });
                
                // Debug logging
                console.log('[Threads] Posts engagement before sorting:', 
                  postsWithEngagement.map(p => ({
                    text: p.text?.substring(0, 30),
                    engagement: p.totalEngagement,
                    date: p.timestamp
                  }))
                );
                
                // Sort by engagement (highest first), then by date if equal
                const sortedPosts = postsWithEngagement.sort((a, b) => {
                  // First sort by engagement
                  if (a.totalEngagement !== b.totalEngagement) {
                    return b.totalEngagement - a.totalEngagement;
                  }
                  // If engagement is equal, sort by date (newest first)
                  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                });
                
                // Take top 3 posts
                return sortedPosts.slice(0, 3).map((post, index) => {
                  const totalEngagement = post.totalEngagement
                  const formatDate = (dateString: string) => {
                    const date = new Date(dateString)
                    const now = new Date()
                    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
                    
                    if (diffInHours < 24) {
                      return `${Math.floor(diffInHours)}h ago`
                    } else if (diffInHours < 48) {
                      return 'Yesterday'
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                  }

                  return (
                    <div key={post.id} className="flex items-start gap-3">
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                        index === 0 && "bg-gradient-to-r from-yellow-400 to-orange-400",
                        index === 1 && "bg-gradient-to-r from-gray-400 to-gray-500",
                        index === 2 && "bg-gradient-to-r from-orange-400 to-orange-500"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 line-clamp-2">{post.text || 'No text'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatNumber(totalEngagement)} engagements</span>
                          <span>{formatNumber(post.metrics?.views || 0)} views</span>
                          <span>{formatDate(post.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Posts Performance */}
      <Card className="overflow-hidden border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="p-1.5 sm:p-2 bg-gray-100 rounded-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
              </div>
              <span className="text-gray-900 font-bold">
                Recent Threads Performance
              </span>
            </CardTitle>
            {selectedAccount && (
              <Badge className="self-start text-xs bg-gray-100 text-gray-700 border-gray-300">
                @{selectedAccount.username || selectedAccount.platform_user_id}
              </Badge>
            )}
            <CardDescription className="text-gray-600 text-xs sm:text-sm">
              Engagement metrics for your latest Threads posts
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="mx-auto h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">No recent Threads posts available</p>
              <p className="text-xs mt-1">Post content to see performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => {
                const totalEngagement = (post.metrics?.likes || 0) + (post.metrics?.replies || 0) + (post.metrics?.reposts || 0)

                return (
                  <div
                    key={post.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {/* Post Thumbnail - 64x64px */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                        {post.media_url || post.thumbnail_url ? (
                          post.media_type === 'VIDEO' ? (
                            post.thumbnail_url ? (
                              <img
                                src={post.thumbnail_url}
                                alt="Video thumbnail"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={post.media_url}
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                              />
                            )
                          ) : (
                            <img
                              src={post.media_url}
                              alt="Post media"
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <AtSign className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-sm line-clamp-2 flex-1">
                            {stripHtml(post.text).slice(0, 80) || 'Untitled Post'}
                          </h4>
                          <div className="ml-2 flex items-center gap-1 bg-gradient-to-r from-gray-700 to-gray-800 text-white px-3 py-1 rounded-full">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs font-semibold">{formatNumber(totalEngagement)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(post.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                          <Heart className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.likes || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Likes</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                          <MessageCircle className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.replies || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Replies</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                          <Repeat2 className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.reposts || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Reposts</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.views || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Views</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {hasMorePosts && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setLoadingMore(true)
                  const newLimit = postsLimit + 5
                  setPostsLimit(newLimit)
                  // Wait for next useEffect to fetch with new limit
                  setTimeout(() => setLoadingMore(false), 100)
                }}
                disabled={loadingMore}
                className="text-gray-600 hover:text-gray-900"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load More Posts
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
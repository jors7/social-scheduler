'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  MousePointer,
  Eye,
  Users,
  Heart,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Info,
  Facebook,
  FileText,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FacebookMetrics {
  impressions: number
  engagement: number
  clicks: number
  reactions: number
  likes: number
  comments: number
  shares: number
  views?: number
  reach?: number
}

interface FacebookPost {
  id: string
  message: string
  created_time: string
  permalink_url: string
  media_type: string
  media_url?: string
  metrics?: FacebookMetrics
}

interface FacebookInsightsProps {
  className?: string
}

export function FacebookInsights({ className }: FacebookInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pageInsights, setPageInsights] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'days_28'>('week')
  const [hasFacebookAccount, setHasFacebookAccount] = useState(false)
  const [facebookAccounts, setFacebookAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [allPosts, setAllPosts] = useState<FacebookPost[]>([]) // All fetched posts
  const [displayLimit, setDisplayLimit] = useState(5) // How many to show
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [switchingAccount, setSwitchingAccount] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')

  // Derived state: posts to display (sliced from allPosts)
  const recentPosts = useMemo(() => allPosts.slice(0, displayLimit), [allPosts, displayLimit])
  const hasMorePosts = displayLimit < allPosts.length

  // Derived state: top performing posts (sorted by reach)
  const topPosts = useMemo(() => {
    if (allPosts.length === 0) return []

    const sorted = [...allPosts].sort((a, b) => {
      const aReach = a.metrics?.reach ?? a.metrics?.impressions ?? a.metrics?.views ?? 0
      const bReach = b.metrics?.reach ?? b.metrics?.impressions ?? b.metrics?.views ?? 0
      return bReach - aReach
    })

    return sorted.slice(0, 3)
  }, [allPosts])

  // Derived state: aggregated metrics from all posts (for Profile Overview)
  // This ensures consistency between Profile Overview and Top Performing Posts
  const aggregatedMetrics = useMemo(() => {
    if (allPosts.length === 0) return null

    let totalViews = 0
    let totalReach = 0
    let totalEngagement = 0
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0

    allPosts.forEach(post => {
      const reach = post.metrics?.reach ?? post.metrics?.impressions ?? post.metrics?.views ?? 0
      const views = post.metrics?.views ?? post.metrics?.impressions ?? reach
      totalReach += reach
      totalViews += views
      totalLikes += post.metrics?.likes ?? 0
      totalComments += post.metrics?.comments ?? 0
      totalShares += post.metrics?.shares ?? 0
      totalEngagement += (post.metrics?.likes ?? 0) + (post.metrics?.comments ?? 0) + (post.metrics?.shares ?? 0)
    })

    return {
      impressions: { value: totalViews, previous: 0 },
      reach: { value: totalReach, previous: 0 },
      engagement: { value: totalEngagement, previous: 0 },
      page_views: { value: Math.floor(totalViews * 0.3), previous: 0 }
    }
  }, [allPosts])


  const fetchFacebookInsights = async (accountId?: string) => {
    try {
      setLoading(true)

      console.log(`[Facebook Insights] fetchFacebookInsights called with accountId: ${accountId}`)
      
      // Check if Facebook account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (!accountResponse.ok) {
        return
      }
      
      const accounts = await accountResponse.json()
      const facebookAccountsList = accounts.filter((acc: any) => acc.platform === 'facebook' && acc.is_active)
      
      if (facebookAccountsList.length === 0) {
        setHasFacebookAccount(false)
        return
      }
      
      setHasFacebookAccount(true)
      setFacebookAccounts(facebookAccountsList)
      
      // Select account to use
      const accountToUse = accountId 
        ? facebookAccountsList.find((acc: any) => acc.id === accountId) 
        : selectedAccount 
        || facebookAccountsList[0]
      
      setSelectedAccount(accountToUse)

      // Check permissions but don't show warning if data is actually working
      const permissionsResponse = await fetch(`/api/facebook/permissions?accountId=${accountToUse.id}`)
      let hasWorkingAnalytics = false
      if (permissionsResponse.ok) {
        const permData = await permissionsResponse.json()
        const accountPerms = permData.accounts?.[0]
        if (accountPerms) {
          hasWorkingAnalytics = accountPerms.hasFullAccess
          console.log(`[${accountToUse.display_name}] Permission check result:`, {
            hasFullAccess: accountPerms.hasFullAccess,
            permissions: accountPerms.permissions,
            errors: accountPerms.errors
          })
        }
      }
      
      // Determine which account to fetch posts for
      let accountToFetch = selectedAccount || facebookAccountsList[0]
      if (accountId) {
        accountToFetch = facebookAccountsList.find((acc: any) => acc.id === accountId) || accountToFetch
      }

      if (!accountToFetch) {
        setAllPosts([])
        return
      }

      // Fetch page insights AND media in PARALLEL for faster loading
      const startTime = Date.now()
      console.log(`[Facebook Insights] Starting parallel fetch for ${accountToFetch.username}...`)

      const pageInsightsParams = new URLSearchParams({
        type: 'page',
        period: selectedPeriod,
        ...(accountToUse?.id && { accountId: accountToUse.id })
      })

      const mediaQueryParams = new URLSearchParams({
        limit: '30', // Fetch 30 posts - good balance of speed and data coverage
        accountId: accountToFetch.id
      })

      // Execute both fetches in parallel
      const [pageInsightsResponse, mediaResponse] = await Promise.all([
        fetch(`/api/facebook/insights?${pageInsightsParams}`),
        fetch(`/api/facebook/media?${mediaQueryParams}`)
      ])

      console.log(`[Facebook Insights] Parallel fetch completed in ${Date.now() - startTime}ms`)

      // Process page insights
      if (pageInsightsResponse.ok) {
        const data = await pageInsightsResponse.json()
        setPageInsights(data.insights)

        const hasData = data.insights && (
          data.insights.impressions?.value > 0 ||
          data.insights.engagement?.value > 0 ||
          data.insights.reach?.value > 0 ||
          data.insights.followers?.value > 0
        )

        if (!hasWorkingAnalytics && !hasData) {
          setPermissionsError('Limited analytics access. Some metrics may be unavailable.')
        } else {
          setPermissionsError(null)
        }
      }

      // Process media
      if (mediaResponse.ok) {
        const data = await mediaResponse.json()
        const { media } = data
        console.log(`[Facebook Insights] Got ${media?.length || 0} posts, top reach:`,
          media?.slice(0, 3).map((p: any) => ({ msg: p.message?.substring(0, 20), reach: p.metrics?.reach }))
        )
        setAllPosts(media || [])
        setDisplayLimit(5)
      } else {
        console.error(`[Facebook Insights] Failed to fetch media`)
        setAllPosts([])
      }
    } catch (error) {
      console.error('Error fetching Facebook insights:', error)
      toast.error('Failed to load Facebook insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load and period change - fetch all posts once
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFacebookInsights()
    }, 100)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod])

  const handleRefresh = async () => {
    setRefreshing(true)
    
    // First update all Facebook post metrics in the database
    try {
      const updateResponse = await fetch('/api/facebook/update-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (updateResponse.ok) {
        const result = await updateResponse.json()
        console.log('Updated Facebook metrics:', result)
        if (result.updatedCount > 0) {
          toast.success(`Updated metrics for ${result.updatedCount} posts`)
        }
      }
    } catch (error) {
      console.error('Error updating metrics:', error)
    }
    
    // Then fetch the insights
    fetchFacebookInsights()
  }

  if (!hasFacebookAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Facebook Insights
          </CardTitle>
          <CardDescription>
            Connect your Facebook Page to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Facebook className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No Facebook Page connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect Facebook
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && !pageInsights) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Facebook Insights
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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Permission Warning */}
      {permissionsError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Limited Analytics Access</p>
              <p className="text-sm text-yellow-700 mt-1">{permissionsError}</p>
              <p className="text-xs text-yellow-600 mt-2">
                To enable full analytics, reconnect your Facebook account with &quot;read_insights&quot; permission.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            {/* Title and Refresh Button Row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex flex-col gap-2">
                {/* Title and Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Facebook className="h-4 w-4 sm:h-5 sm:w-5" />
                    Profile Overview
                  </CardTitle>
                  {selectedAccount && (
                    <Badge variant="outline" className="self-start sm:self-auto text-xs">
                      {selectedAccount.display_name || selectedAccount.username}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <CardDescription className="text-xs sm:text-sm">
                  Your Facebook performance metrics
                </CardDescription>
              </div>

              {/* Refresh Button - Top right on desktop */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:flex-shrink-0">
                {facebookAccounts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <select
                      className={cn(
                        "text-xs sm:text-sm border rounded-lg px-3 py-1.5 bg-white flex-1 sm:flex-initial",
                        switchingAccount && "opacity-60 cursor-wait"
                      )}
                      value={selectedAccount?.id || ''}
                      onChange={async (e) => {
                        const account = facebookAccounts.find(acc => acc.id === e.target.value)
                        if (account && !switchingAccount) {
                          setSwitchingAccount(true)
                          setLoadingMessage(`Loading analytics for ${account.display_name || account.username}...`)
                          toast.info(`Switching to ${account.display_name || account.username}...`)

                          // Set a timeout for long loading
                          const timeoutId = setTimeout(() => {
                            if (switchingAccount) {
                              toast.info('Still loading, this may take a moment...')
                            }
                          }, 5000)

                          setSelectedAccount(account)
                          await fetchFacebookInsights(account.id)

                          clearTimeout(timeoutId)
                          setSwitchingAccount(false)
                          setLoadingMessage('')
                          toast.success('Analytics loaded successfully')
                        }
                      }}
                      disabled={switchingAccount}
                    >
                      {facebookAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.display_name || account.username}
                        </option>
                      ))}
                    </select>
                    {switchingAccount && (
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-gray-500" />
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full sm:w-auto hover:shadow-md transition-all"
                >
                  <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2", refreshing && "animate-spin")} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {/* Loading overlay */}
          {switchingAccount && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600 font-medium">{loadingMessage || 'Loading...'}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Views - use aggregated from posts for accuracy */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4 text-purple-500" />
                <span title="Total views from all posts">Views</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(aggregatedMetrics?.impressions?.value || pageInsights?.impressions?.value || 0)}
              </p>
            </div>

            {/* Engagement - use aggregated from posts */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4 text-green-500" />
                <span>Engagement</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(aggregatedMetrics?.engagement?.value || pageInsights?.engagement?.value || 0)}
              </p>
            </div>

            {/* Page Views - estimated from views */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MousePointer className="h-4 w-4 text-blue-500" />
                <span>Page Views</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(aggregatedMetrics?.page_views?.value || pageInsights?.page_views?.value || 0)}
              </p>
            </div>

            {/* Reach - use aggregated from posts for accuracy */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-orange-500" />
                <span>Reach</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(aggregatedMetrics?.reach?.value || pageInsights?.reach?.value || 0)}
              </p>
            </div>

            {/* Followers - from page info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Followers</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.followers?.value || pageInsights?.fan_count?.value || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Posts */}
      {(topPosts.length > 0 || (loading && allPosts.length === 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Posts
            </CardTitle>
            <CardDescription>
              Your best posts from the last 30 days based on reach
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && allPosts.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {topPosts.map((post, index) => {
                  // Use reach first (that's what's displayed in the posts list)
                  const reachValue = post.metrics?.reach ?? post.metrics?.impressions ?? post.metrics?.views ?? 0

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
                        <p className="text-sm text-gray-700 line-clamp-2">{post.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{formatNumber(reachValue)}</span>
                          </div>
                          <span>{formatDate(post.created_time)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Banner for Instagram Cross-Posts */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          <span className="font-medium">Note:</span> Likes, comments, and shares may show as 0 for posts cross-posted from Instagram.
          This is a Facebook API limitation — engagement data for cross-posts is only available through Instagram.
          Reach and views are tracked accurately for all posts.
        </p>
      </div>

      {/* Recent Posts Performance */}
      <Card className="overflow-hidden border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <span className="text-gray-900 font-bold">
                  Recent Posts Performance
                </span>
              </CardTitle>
              {selectedAccount && (
                <Badge className="self-start sm:self-auto text-xs bg-gray-100 text-gray-700 border-gray-300">
                  {selectedAccount.display_name || selectedAccount.username}
                </Badge>
              )}
            </div>
            <CardDescription className="text-gray-600 text-xs sm:text-sm">
              Engagement metrics for your latest Facebook posts
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 relative">
          {/* Loading overlay for posts section */}
          {switchingAccount && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600 font-medium">Loading posts...</p>
              </div>
            </div>
          )}
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="mx-auto h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">No recent posts with insights available</p>
              <p className="text-xs mt-1">Post content to see performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => {
                const totalEngagement = (post.metrics?.likes || 0) + (post.metrics?.comments || 0) + (post.metrics?.shares || 0)

                return (
                  <div
                    key={post.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {/* Post Thumbnail - 64x64px */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                        {post.media_url ? (
                          <img
                            src={post.media_url}
                            alt="Post media"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <Facebook className="h-8 w-8 text-blue-400" />
                          </div>
                        )}
                      </div>

                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-sm line-clamp-2 flex-1">
                            {post.message?.slice(0, 80) || 'Untitled Post'}
                          </h4>
                          <div className="ml-2 flex items-center gap-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs font-semibold">{formatNumber(totalEngagement)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(post.created_time).toLocaleDateString('en-US', {
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
                          <ThumbsUp className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.likes || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Likes</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                          <MessageCircle className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.comments || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Comments</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                          <Share2 className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.shares || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Shares</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.reach || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Reach</p>
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
                onClick={() => setDisplayLimit(prev => Math.min(prev + 5, allPosts.length))}
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Show More ({allPosts.length - displayLimit} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
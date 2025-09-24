'use client'

import { useState, useEffect } from 'react'
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
  const [recentPosts, setRecentPosts] = useState<FacebookPost[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'days_28'>('week')
  const [hasFacebookAccount, setHasFacebookAccount] = useState(false)
  const [facebookAccounts, setFacebookAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [postsLimit, setPostsLimit] = useState(5)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [permissionsError, setPermissionsError] = useState<string | null>(null)

  const fetchFacebookInsights = async (accountId?: string) => {
    try {
      setLoading(true)
      
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
      
      // Fetch page-level insights for the selected account
      const queryParams = new URLSearchParams({
        type: 'page',
        period: selectedPeriod,
        ...(accountToUse?.id && { accountId: accountToUse.id })
      })
      const pageInsightsResponse = await fetch(`/api/facebook/insights?${queryParams}`)
      if (pageInsightsResponse.ok) {
        const data = await pageInsightsResponse.json()
        console.log('Page insights data received in component:', data)
        console.log('Setting pageInsights to:', data.insights)
        console.log('Detailed insights values:', {
          impressions: data.insights?.impressions,
          engagement: data.insights?.engagement,
          reach: data.insights?.reach,
          page_views: data.insights?.page_views,
          followers: data.insights?.followers
        })
        setPageInsights(data.insights)
        
        // Check if we actually got data
        const hasData = data.insights && (
          data.insights.impressions?.value > 0 ||
          data.insights.engagement?.value > 0 ||
          data.insights.reach?.value > 0 ||
          data.insights.followers?.value > 0
        )
        
        // Only show permission error if we have no working analytics AND no data
        if (!hasWorkingAnalytics && !hasData) {
          setPermissionsError('Limited analytics access. Some metrics may be unavailable.')
        } else {
          setPermissionsError(null)
        }
        
        // Show a message if insights are limited
        if (data.error) {
          console.log('Limited insights available:', data.error)
        }
      }

      // Fetch recent posts directly from Facebook
      const mediaQueryParams = new URLSearchParams({
        limit: postsLimit.toString(),
        ...(accountToUse?.id && { accountId: accountToUse.id })
      })
      const mediaResponse = await fetch(`/api/facebook/media?${mediaQueryParams}`)
      if (mediaResponse.ok) {
        const { media } = await mediaResponse.json()
        setRecentPosts(media || [])
        
        // Check if there might be more posts available
        setHasMorePosts(media && media.length === postsLimit)
      }
    } catch (error) {
      console.error('Error fetching Facebook insights:', error)
      toast.error('Failed to load Facebook insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(() => {
      fetchFacebookInsights()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [selectedPeriod, postsLimit])

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
                To enable full analytics, reconnect your Facebook account with "read_insights" permission.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5" />
              Profile Overview
              {selectedAccount && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {selectedAccount.display_name || selectedAccount.username}
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const response = await fetch(`/api/facebook/permissions${selectedAccount ? `?accountId=${selectedAccount.id}` : ''}`);
                  if (response.ok) {
                    const data = await response.json();
                    console.log('Permissions check:', data);
                    if (data.accounts?.[0]) {
                      const acc = data.accounts[0];
                      if (!acc.hasFullAccess) {
                        // Check if we're actually getting data despite permission issues
                        if (pageInsights && (pageInsights.impressions?.value > 0 || pageInsights.engagement?.value > 0)) {
                          toast.info(`${acc.pageName} has working analytics despite permission warnings`);
                        } else {
                          toast.warning(`${acc.pageName} may have limited analytics access. Try refreshing.`);
                        }
                      } else {
                        toast.success(`${acc.pageName} analytics working correctly`);
                      }
                    }
                  }
                }}
                className="text-xs"
              >
                <Info className="h-3 w-3 mr-1" />
                Check Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="hover:shadow-md transition-all"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
          <CardDescription>
            Your Facebook performance metrics
          </CardDescription>
          {facebookAccounts.length > 1 && (
            <div className="mt-2">
              <select
                className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                value={selectedAccount?.id || ''}
                onChange={(e) => {
                  const account = facebookAccounts.find(acc => acc.id === e.target.value)
                  if (account) {
                    setSelectedAccount(account)
                    fetchFacebookInsights(account.id)
                  }
                }}
              >
                {facebookAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.display_name || account.username}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Impressions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Impressions</p>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.impressions?.value || 0)}
              </p>
              {getChangeIndicator(pageInsights?.impressions?.value || 0, pageInsights?.impressions?.previous || 0)}
            </div>

            {/* Engagement */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Engagement</p>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.engagement?.value || 0)}
              </p>
              {getChangeIndicator(pageInsights?.engagement?.value || 0, pageInsights?.engagement?.previous || 0)}
            </div>

            {/* Page Views */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Page Views</p>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.page_views?.value || 0)}
              </p>
              {getChangeIndicator(pageInsights?.page_views?.value || 0, pageInsights?.page_views?.previous || 0)}
            </div>

            {/* Reach */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Reach</p>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.reach?.value || 0)}
              </p>
              {getChangeIndicator(pageInsights?.reach?.value || 0, pageInsights?.reach?.previous || 0)}
            </div>

            {/* Followers */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Followers</p>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(pageInsights?.followers?.value || pageInsights?.fan_count?.value || 0)}
              </p>
              {getChangeIndicator(pageInsights?.followers?.value || 0, pageInsights?.followers?.previous || 0)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts Performance */}
      <Card className="overflow-hidden border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-gray-900 font-bold">
              Recent Posts Performance
            </span>
            {selectedAccount && (
              <Badge className="ml-2 text-xs bg-gray-100 text-gray-700 border-gray-300">
                {selectedAccount.display_name || selectedAccount.username}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-gray-600 mt-1">
            Engagement metrics for your latest Facebook posts
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="mx-auto h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">No recent posts with insights available</p>
              <p className="text-xs mt-1">Post content to see performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200 bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {post.message?.slice(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {new Date(post.created_time).toLocaleDateString()}
                      </p>
                    </div>
                    {post.media_url ? (
                      <div className="ml-3 flex-shrink-0">
                        <img
                          src={post.media_url}
                          alt="Post media"
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    ) : (
                      <div className="ml-3 flex-shrink-0">
                        <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Reach</p>
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(post.metrics?.impressions || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-3 w-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Likes</p>
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(post.metrics?.likes || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-3 w-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Comments</p>
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(post.metrics?.comments || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Share2 className="h-3 w-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Shares</p>
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(post.metrics?.shares || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-3 w-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Clicks</p>
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(post.metrics?.clicks || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
              {recentPosts
                .sort((a, b) => {
                  const engagementA = (a.metrics?.reactions || 0) + (a.metrics?.likes || 0) + (a.metrics?.comments || 0) + (a.metrics?.shares || 0)
                  const engagementB = (b.metrics?.reactions || 0) + (b.metrics?.likes || 0) + (b.metrics?.comments || 0) + (b.metrics?.shares || 0)
                  return engagementB - engagementA
                })
                .slice(0, 3)
                .map((post, index) => {
                  const totalEngagement = (post.metrics?.reactions || 0) + (post.metrics?.likes || 0) + 
                                         (post.metrics?.comments || 0) + (post.metrics?.shares || 0)
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
                          <span>{formatNumber(totalEngagement)} engagements</span>
                          <span>{formatNumber(post.metrics?.views || post.metrics?.impressions || post.metrics?.reach || 0)} views</span>
                          <span>{formatDate(post.created_time)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
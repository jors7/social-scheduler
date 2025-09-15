'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Eye, 
  Users, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Info,
  Camera,
  FileText,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InstagramMetrics {
  impressions: number
  reach: number
  saves: number
  profile_views: number
  follower_count: number
  engagement: number
  likes: number
  comments: number
  shares: number
}

interface InstagramPost {
  id: string
  media_id: string
  caption: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  metrics?: InstagramMetrics
}

interface InstagramInsightsProps {
  className?: string
}

export function InstagramInsights({ className }: InstagramInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [userInsights, setUserInsights] = useState<any>(null)
  const [recentPosts, setRecentPosts] = useState<InstagramPost[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'days_28'>('week')
  const [hasInstagramAccount, setHasInstagramAccount] = useState(false)
  const [instagramAccounts, setInstagramAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [postsLimit, setPostsLimit] = useState(5)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchInstagramInsights = async (accountId?: string) => {
    try {
      setLoading(true)
      
      // Check if Instagram account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (accountResponse.ok) {
        const accounts = await accountResponse.json()
        const instagramAccountsList = accounts.filter((acc: any) => acc.platform === 'instagram' && acc.is_active)
        
        if (instagramAccountsList.length === 0) {
          setHasInstagramAccount(false)
          return
        }
        
        setHasInstagramAccount(true)
        setInstagramAccounts(instagramAccountsList)
        
        // Select account to use
        const accountToUse = accountId 
          ? instagramAccountsList.find((acc: any) => acc.id === accountId) 
          : selectedAccount 
          || instagramAccountsList[0]
        
        setSelectedAccount(accountToUse)
      } else {
        return
      }

      // Fetch user-level insights for the selected account
      const queryParams = new URLSearchParams({
        type: 'user',
        period: selectedPeriod,
        ...(selectedAccount?.id && { accountId: selectedAccount.id })
      })
      const userInsightsResponse = await fetch(`/api/instagram/insights?${queryParams}`)
      if (userInsightsResponse.ok) {
        const data = await userInsightsResponse.json()
        setUserInsights(data.insights)
      }

      // Fetch recent posts directly from Instagram
      const mediaQueryParams = new URLSearchParams({
        limit: postsLimit.toString(),
        ...(selectedAccount?.id && { accountId: selectedAccount.id })
      })
      const mediaResponse = await fetch(`/api/instagram/media?${mediaQueryParams}`)
      if (mediaResponse.ok) {
        const { media } = await mediaResponse.json()
        
        // Check if there might be more posts available
        setHasMorePosts(media.length === postsLimit)
        
        // Fetch insights for each Instagram post
        const postsWithInsights = await Promise.all(
          media.map(async (post: any) => {
            // Start with basic engagement metrics from the media object
            let metrics = {
              impressions: 0,
              reach: 0,
              saves: 0,
              likes: post.like_count || 0,  // Use like_count from media object
              comments: post.comments_count || 0,  // Use comments_count from media object
              shares: 0,
              engagement: 0,
              profile_views: 0,
              follower_count: 0
            }
            
            try {
              // Fetch additional insights that aren't available on media object
              const insightsResponse = await fetch(`/api/instagram/insights?mediaId=${post.id}&type=media&accountId=${selectedAccount?.id || ''}`)
              if (insightsResponse.ok) {
                const { insights } = await insightsResponse.json()
                // Merge insights with existing metrics
                metrics = {
                  ...metrics,
                  impressions: insights.impressions?.value || 0,
                  reach: insights.reach?.value || 0,
                  saves: insights.saved?.value || 0,
                  shares: insights.shares?.value || 0,
                  engagement: insights.total_interactions?.value || 0
                }
              }
            } catch (error) {
              console.error('Error fetching post insights:', error)
              // Continue with basic metrics even if insights fail
            }
            
            return {
              id: post.id,
              media_id: post.id,
              caption: post.caption || '',
              media_type: post.media_type,
              media_url: post.media_url,
              thumbnail_url: post.thumbnail_url,
              permalink: post.permalink,
              timestamp: post.timestamp,
              metrics
            }
          })
        )

        setRecentPosts(postsWithInsights.filter(Boolean))
      }
    } catch (error) {
      console.error('Error fetching Instagram insights:', error)
      toast.error('Failed to load Instagram insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(() => {
      fetchInstagramInsights()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [selectedPeriod, postsLimit])

  const handleRefresh = async () => {
    setRefreshing(true)
    
    // First update all Instagram post metrics in the database
    try {
      const updateResponse = await fetch('/api/instagram/update-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (updateResponse.ok) {
        const result = await updateResponse.json()
        console.log('Updated Instagram metrics:', result)
        if (result.updatedCount > 0) {
          toast.success(`Updated metrics for ${result.updatedCount} posts`)
        }
      }
    } catch (error) {
      console.error('Error updating metrics:', error)
    }
    
    // Then fetch the insights
    fetchInstagramInsights()
  }

  if (!hasInstagramAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Instagram Insights
          </CardTitle>
          <CardDescription>
            Connect your Instagram Business account to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Camera className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No Instagram Business account connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect Instagram
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && !userInsights) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Instagram Insights
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
      {/* Account Overview */}
      <Card className="overflow-hidden border border-gray-200">
        <CardHeader className="bg-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Camera className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-gray-900 font-bold">
                    Instagram Insights
                  </span>
                  {selectedAccount && (
                    <Badge className="ml-2 bg-gray-100 text-gray-700 border-gray-300">
                      @{selectedAccount.username || selectedAccount.platform_user_id}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {selectedAccount 
                    ? `Analytics for @${selectedAccount.username || selectedAccount.platform_user_id}`
                    : 'Performance metrics for your Instagram Business account'}
                </CardDescription>
              {instagramAccounts.length > 1 && (
                <div className="mt-2">
                  <select
                    className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                    value={selectedAccount?.id || ''}
                    onChange={(e) => {
                      const account = instagramAccounts.find(acc => acc.id === e.target.value)
                      if (account) {
                        setSelectedAccount(account)
                        fetchInstagramInsights(account.id)
                      }
                    }}
                  >
                    {instagramAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        @{account.username || account.platform_user_id}
                      </option>
                    ))}
                  </select>
                  <span className="ml-2 text-xs text-gray-500">
                    Switch between {instagramAccounts.length} connected accounts
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
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Reach */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Reach</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(userInsights?.reach?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.reach?.value || 0, userInsights?.reach?.previous || 0)}
            </div>

            {/* Profile Views */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Profile Views</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(userInsights?.profile_views?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.profile_views?.value || 0, userInsights?.profile_views?.previous || 0)}
            </div>

            {/* Website Clicks */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Website Clicks</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(userInsights?.website_clicks?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.website_clicks?.value || 0, userInsights?.website_clicks?.previous || 0)}
            </div>

            {/* Follower Count */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Followers</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(userInsights?.follower_count?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.follower_count?.value || 0, userInsights?.follower_count?.previous || 0)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts Performance */}
      <Card className="overflow-hidden border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-gray-900 font-bold">
              Recent Posts Performance
            </span>
            {selectedAccount && (
              <Badge className="ml-2 text-xs bg-gray-100 text-gray-700 border-gray-300">
                @{selectedAccount.username || selectedAccount.platform_user_id}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-gray-600 mt-1">
            Engagement metrics for your latest Instagram posts
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
                        {post.caption.replace(/<[^>]*>/g, '').slice(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(post.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    {post.media_url ? (
                      <div className="ml-3 flex-shrink-0">
                        {post.media_type === 'VIDEO' ? (
                          post.thumbnail_url ? (
                            <img
                              src={post.thumbnail_url}
                              alt="Video thumbnail"
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <video
                              src={post.media_url}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              muted
                              preload="metadata"
                            />
                          )
                        ) : (
                          <img
                            src={post.media_url}
                            alt="Post media"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        )}
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
                        <p className="text-xs text-gray-500">Impressions</p>
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(post.metrics?.impressions || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Reach</p>
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(post.metrics?.reach || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="h-3 w-3 text-gray-400" />
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
                      <Bookmark className="h-3 w-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Saves</p>
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(post.metrics?.saves || 0)}</p>
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
    </div>
  )
}
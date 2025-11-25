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
  ChevronDown,
  MousePointer
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InstagramMetrics {
  reach: number
  saves: number
  profile_views: number
  follower_count: number
  engagement: number
  likes: number
  comments: number
  shares: number
  total_interactions: number
  accounts_engaged?: number
  plays?: number // For REELS
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
  const [tokenExpired, setTokenExpired] = useState(false)
  const [accountInfo, setAccountInfo] = useState<any>(null)

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

      // Fetch recent posts directly from Instagram (user insights will be calculated from post metrics)
      const mediaQueryParams = new URLSearchParams({
        limit: postsLimit.toString(),
        ...(accountToUse?.id && { accountId: accountToUse.id })
      })
      const mediaResponse = await fetch(`/api/instagram/media?${mediaQueryParams}`)
      if (mediaResponse.ok) {
        const { media, account: fetchedAccountInfo } = await mediaResponse.json()

        // Store account info for displaying limitations
        setAccountInfo(fetchedAccountInfo)

        // Check if there might be more posts available
        setHasMorePosts(media.length === postsLimit)
        setTokenExpired(false)
        
        // Fetch insights for each Instagram post
        const postsWithInsights = await Promise.all(
          media.map(async (post: any) => {
            // Start with basic engagement metrics from the media object
            let metrics = {
              reach: 0,
              saves: 0,
              likes: post.like_count || 0,  // Use like_count from media object
              comments: post.comments_count || 0,  // Use comments_count from media object
              shares: 0,
              engagement: 0,
              total_interactions: 0,
              profile_views: 0,
              follower_count: 0,
              plays: 0 // For REELS/VIDEO
            }
            
            try {
              // Fetch additional insights that aren't available on media object
              // Pass media type to get the right metrics
              console.log('Fetching insights for post:', post.id, 'type:', post.media_type)
              const insightsResponse = await fetch(`/api/instagram/insights?mediaId=${post.id}&type=media&mediaType=${post.media_type}&accountId=${accountToUse?.id || ''}`)
              if (insightsResponse.ok) {
                const { insights } = await insightsResponse.json()
                // Merge insights with existing metrics
                // Handle different metric names based on media type
                if (post.media_type === 'VIDEO' || post.media_type === 'REELS') {
                  metrics = {
                    ...metrics,
                    plays: insights.plays?.value || 0, // Plays for videos/reels
                    reach: insights.reach?.value || 0,
                    saves: insights.saved?.value || insights.saves?.value || 0,
                    shares: insights.shares?.value || 0,
                    total_interactions: insights.total_interactions?.value || 0,
                    engagement: insights.total_interactions?.value || 0
                  }
                } else if (post.media_type === 'CAROUSEL_ALBUM') {
                  metrics = {
                    ...metrics,
                    reach: insights.reach?.value || 0,
                    saves: insights.saved?.value || insights.saves?.value || 0,
                    shares: insights.shares?.value || 0,
                    total_interactions: insights.total_interactions?.value || 0,
                    engagement: insights.total_interactions?.value || 0
                  }
                } else {
                  // For regular IMAGE posts
                  metrics = {
                    ...metrics,
                    reach: insights.reach?.value || 0,
                    saves: insights.saved?.value || insights.saves?.value || 0,
                    shares: insights.shares?.value || 0,
                    total_interactions: insights.total_interactions?.value || 0,
                    engagement: insights.total_interactions?.value || insights.engagement?.value || 0
                  }
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

        // Calculate profile overview from post metrics instead of user insights API
        const profileMetrics = postsWithInsights.reduce((acc, post) => {
          return {
            reach: acc.reach + (post.metrics?.reach || 0),
            total_interactions: acc.total_interactions + (post.metrics?.total_interactions || 0),
            likes: acc.likes + (post.metrics?.likes || 0),
            comments: acc.comments + (post.metrics?.comments || 0),
            shares: acc.shares + (post.metrics?.shares || 0),
            saves: acc.saves + (post.metrics?.saves || 0)
          }
        }, { reach: 0, total_interactions: 0, likes: 0, comments: 0, shares: 0, saves: 0 })

        // Set user insights with calculated values from posts + account info
        setUserInsights({
          reach: { value: profileMetrics.reach },
          total_interactions: { value: profileMetrics.total_interactions },
          likes: { value: profileMetrics.likes },
          comments: { value: profileMetrics.comments },
          shares: { value: profileMetrics.shares },
          saves: { value: profileMetrics.saves },
          profile_views: { value: 0 }, // Not available (requires 100+ followers)
          follower_count: { value: fetchedAccountInfo?.followers_count || 0 }, // From account info
          accounts_engaged: { value: 0 } // Not available
        })
      } else {
        // Check if token expired
        const errorData = await mediaResponse.json()
        if (errorData.error?.includes('OAuth') || errorData.error?.includes('token')) {
          setTokenExpired(true)
          console.log('Instagram token expired, need to reconnect')
        }
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

  if (tokenExpired) {
    return (
      <Card className={cn("border-orange-200 bg-orange-50", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <Camera className="h-5 w-5" />
            Instagram Token Expired
          </CardTitle>
          <CardDescription className="text-orange-700">
            Your Instagram connection has expired and needs to be refreshed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 text-orange-400 mb-4 flex items-center justify-center">
              <RefreshCw className="h-8 w-8" />
            </div>
            <p className="text-sm text-orange-700 mb-4">
              Instagram requires periodic re-authentication for security.
              Please reconnect your account to continue viewing insights.
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.href = '/dashboard/settings'}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reconnect Instagram Account
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
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  Your Instagram performance metrics
                </CardDescription>
              </div>

              {/* Refresh Button - Top right on desktop */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:flex-shrink-0">
                {instagramAccounts.length > 1 && (
                  <select
                    className="text-xs sm:text-sm border rounded-lg px-3 py-1.5 bg-white"
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
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Reach */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Reach</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.reach?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.reach?.value || 0, userInsights?.reach?.previous || 0)}
            </div>

            {/* Profile Views */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4 text-purple-500" />
                <span>Profile Views</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.profile_views?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.profile_views?.value || 0, userInsights?.profile_views?.previous || 0)}
            </div>

            {/* Total Interactions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4 text-green-500" />
                <span>Total Interactions</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.total_interactions?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.total_interactions?.value || 0, userInsights?.total_interactions?.previous || 0)}
            </div>

            {/* Accounts Engaged */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-orange-500" />
                <span>Accounts Engaged</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.accounts_engaged?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.accounts_engaged?.value || 0, userInsights?.accounts_engaged?.previous || 0)}
            </div>

            {/* Engagement */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Engagement</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber((userInsights?.likes?.value || 0) + (userInsights?.comments?.value || 0))}
              </p>
              {getChangeIndicator(
                (userInsights?.likes?.value || 0) + (userInsights?.comments?.value || 0),
                (userInsights?.likes?.previous || 0) + (userInsights?.comments?.previous || 0)
              )}
            </div>

            {/* Followers */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-indigo-500" />
                <span>Followers</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.follower_count?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.follower_count?.value || 0, userInsights?.follower_count?.previous || 0)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Limitations Info */}
      {accountInfo && (accountInfo.followers_count < 100 || accountInfo.account_type === 'MEDIA_CREATOR') && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm text-blue-900">
            <p className="font-medium mb-1">Some metrics may show limited data:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              {accountInfo.followers_count < 100 && (
                <li>Profile Views requires 100+ followers (you have {accountInfo.followers_count})</li>
              )}
              {accountInfo.account_type === 'MEDIA_CREATOR' && (
                <li>Accounts Engaged is not available for Creator accounts</li>
              )}
            </ul>
          </div>
        </div>
      )}

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
                                    (post.metrics?.comments || 0) + 
                                    (post.metrics?.saves || 0);
                  return { ...post, totalEngagement: engagement };
                });
                
                // Debug logging
                console.log('[Instagram] Posts engagement before sorting:', 
                  postsWithEngagement.map(p => ({
                    caption: p.caption?.substring(0, 30),
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
                        <p className="text-sm text-gray-700 line-clamp-2">{post.caption || 'No caption'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatNumber(totalEngagement)} engagements</span>
                          <span>{formatNumber(post.metrics?.reach || 0)} reach</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <span className="text-gray-900 font-bold">
                  Recent Posts Performance
                </span>
              </CardTitle>
              {selectedAccount && (
                <Badge className="self-start sm:self-auto text-xs bg-gray-100 text-gray-700 border-gray-300">
                  @{selectedAccount.username || selectedAccount.platform_user_id}
                </Badge>
              )}
            </div>
            <CardDescription className="text-gray-600 text-xs sm:text-sm">
              Engagement metrics for your latest Instagram posts
            </CardDescription>
          </div>
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
              {recentPosts.map((post) => {
                const totalEngagement = (post.metrics?.likes || 0) + (post.metrics?.comments || 0) + (post.metrics?.saves || 0)

                return (
                  <div
                    key={post.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {/* Post Thumbnail - 64x64px */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                        {post.media_url ? (
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
                          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-200 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-purple-400" />
                          </div>
                        )}
                      </div>

                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-sm line-clamp-2 flex-1">
                            {post.caption.replace(/<[^>]*>/g, '').slice(0, 80) || 'Untitled Post'}
                          </h4>
                          <div className="ml-2 flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-1 rounded-full">
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
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.comments || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Comments</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                          <Bookmark className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(post.metrics?.saves || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Saves</p>
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
                onClick={() => {
                  const newLimit = postsLimit + 5
                  setPostsLimit(newLimit)
                  // Let useEffect handle loading state via setLoading()
                }}
                disabled={loading}
                className="text-gray-600 hover:text-gray-900"
              >
                {loading ? (
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
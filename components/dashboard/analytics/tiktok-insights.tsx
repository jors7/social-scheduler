'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Info,
  Music,
  ChevronDown,
  Play
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TikTokMetrics {
  views: number
  likes: number
  comments: number
  shares: number
}

interface TikTokVideo {
  id: string
  title: string
  description: string
  duration: number
  cover_image_url: string
  embed_link: string
  created_time: string
  metrics: TikTokMetrics
  totalEngagement: number
}

interface TikTokInsightsProps {
  className?: string
}

export function TikTokInsights({ className }: TikTokInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [userInsights, setUserInsights] = useState<any>(null)
  const [recentVideos, setRecentVideos] = useState<TikTokVideo[]>([])
  const [hasTikTokAccount, setHasTikTokAccount] = useState(false)
  const [tiktokAccounts, setTikTokAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [videosLimit, setVideosLimit] = useState(5)
  const [hasMoreVideos, setHasMoreVideos] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [scopeError, setScopeError] = useState(false)
  const [switchingAccount, setSwitchingAccount] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')

  const fetchTikTokInsights = async (accountId?: string) => {
    try {
      setLoading(true)

      console.log(`[TikTok Insights] fetchTikTokInsights called with accountId: ${accountId}`)

      // Check if TikTok account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (!accountResponse.ok) {
        return
      }

      const accounts = await accountResponse.json()
      const tiktokAccountsList = accounts.filter((acc: any) => acc.platform === 'tiktok' && acc.is_active)

      if (tiktokAccountsList.length === 0) {
        setHasTikTokAccount(false)
        return
      }

      setHasTikTokAccount(true)
      setTikTokAccounts(tiktokAccountsList)

      // Select account to use
      const accountToUse = accountId
        ? tiktokAccountsList.find((acc: any) => acc.id === accountId)
        : selectedAccount
        || tiktokAccountsList[0]

      setSelectedAccount(accountToUse)

      // Fetch user insights
      const insightsQueryParams = new URLSearchParams({
        type: 'user',
        ...(accountToUse?.id && { accountId: accountToUse.id })
      })
      const insightsResponse = await fetch(`/api/tiktok/insights?${insightsQueryParams}`)

      if (insightsResponse.ok) {
        const data = await insightsResponse.json()
        console.log('TikTok insights data received:', data)
        setUserInsights(data.insights)
        setTokenExpired(false)
        setScopeError(false)
      } else {
        const errorData = await insightsResponse.json()
        if (errorData.tokenExpired) {
          setTokenExpired(true)
          return
        }
        if (errorData.scopeError) {
          setScopeError(true)
          return
        }
      }

      // Fetch recent videos
      const mediaQueryParams = new URLSearchParams({
        limit: videosLimit.toString(),
        ...(accountToUse?.id && { accountId: accountToUse.id })
      })

      console.log(`[TikTok Insights] Fetching videos for account:`, {
        id: accountToUse.id,
        username: accountToUse.username,
        url: `/api/tiktok/media?${mediaQueryParams.toString()}`
      })

      const mediaResponse = await fetch(`/api/tiktok/media?${mediaQueryParams}`)
      if (mediaResponse.ok) {
        const data = await mediaResponse.json()
        const { media, has_more } = data
        console.log(`[TikTok Insights] Response for ${accountToUse.username}:`, {
          mediaCount: media?.length || 0,
          hasMore: has_more,
          firstVideo: media?.[0] ? {
            title: media[0].title?.substring(0, 30),
            created_time: media[0].created_time
          } : null
        })
        setRecentVideos(media || [])
        setHasMoreVideos(has_more || false)
        setTokenExpired(false)
        setScopeError(false)
      } else {
        const errorData = await mediaResponse.json()
        console.error(`[TikTok Insights] Failed to fetch videos for ${accountToUse.username}`)
        if (errorData.tokenExpired) {
          setTokenExpired(true)
        }
        if (errorData.scopeError) {
          setScopeError(true)
        }
        setRecentVideos([])
        setHasMoreVideos(false)
      }
    } catch (error) {
      console.error('Error fetching TikTok insights:', error)
      toast.error('Failed to load TikTok insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(() => {
      fetchTikTokInsights()
    }, 100)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videosLimit])

  const handleRefresh = async () => {
    setRefreshing(true)
    fetchTikTokInsights()
  }

  if (!hasTikTokAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            TikTok Insights
          </CardTitle>
          <CardDescription>
            Connect your TikTok account to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Music className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No TikTok account connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect TikTok
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
            <Music className="h-5 w-5" />
            TikTok Token Expired
          </CardTitle>
          <CardDescription className="text-orange-700">
            Your TikTok connection has expired and needs to be refreshed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 text-orange-400 mb-4 flex items-center justify-center">
              <RefreshCw className="h-8 w-8" />
            </div>
            <p className="text-sm text-orange-700 mb-4">
              TikTok requires periodic re-authentication for security.
              Please reconnect your account to continue viewing insights.
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.href = '/dashboard/settings'}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reconnect TikTok Account
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (scopeError) {
    return (
      <Card className={cn("border-yellow-200 bg-yellow-50", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <Music className="h-5 w-5" />
            Missing Permissions
          </CardTitle>
          <CardDescription className="text-yellow-700">
            Your TikTok account needs additional permissions for analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Info className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
            <p className="text-sm text-yellow-700 mb-4">
              Analytics require the video.list permission. Please reconnect your TikTok account with the necessary permissions.
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.href = '/dashboard/settings'}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Update Permissions
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
            <Music className="h-5 w-5" />
            TikTok Insights
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

  // Calculate total views and engagement from videos
  const totalViews = recentVideos.reduce((sum, video) => sum + (video.metrics?.views || 0), 0)
  const totalEngagement = recentVideos.reduce((sum, video) => sum + video.totalEngagement, 0)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Profile Overview
              {selectedAccount && (
                <Badge variant="outline" className="ml-2 text-xs">
                  @{selectedAccount.username || selectedAccount.platform_user_id}
                </Badge>
              )}
            </CardTitle>
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
          <CardDescription>
            Your TikTok performance metrics
          </CardDescription>
          {tiktokAccounts.length > 1 && (
            <div className="mt-2 flex items-center gap-2">
              <select
                className={cn(
                  "text-sm border rounded-lg px-3 py-1.5 bg-white",
                  switchingAccount && "opacity-60 cursor-wait"
                )}
                value={selectedAccount?.id || ''}
                onChange={async (e) => {
                  const account = tiktokAccounts.find(acc => acc.id === e.target.value)
                  if (account && !switchingAccount) {
                    setSwitchingAccount(true)
                    setLoadingMessage(`Loading analytics for ${account.display_name || account.username}...`)
                    toast.info(`Switching to ${account.display_name || account.username}...`)

                    const timeoutId = setTimeout(() => {
                      if (switchingAccount) {
                        toast.info('Still loading, this may take a moment...')
                      }
                    }, 5000)

                    setSelectedAccount(account)
                    await fetchTikTokInsights(account.id)

                    clearTimeout(timeoutId)
                    setSwitchingAccount(false)
                    setLoadingMessage('')
                    toast.success('Analytics loaded successfully')
                  }
                }}
                disabled={switchingAccount}
              >
                {tiktokAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.display_name || account.username}
                  </option>
                ))}
              </select>
              {switchingAccount && (
                <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="relative">
          {/* Loading overlay */}
          {switchingAccount && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-cyan-600" />
                <p className="text-sm text-gray-600 font-medium">{loadingMessage || 'Loading...'}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Followers */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-cyan-500" />
                <span>Followers</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.follower_count?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.follower_count?.value || 0, userInsights?.follower_count?.previous || 0)}
            </div>

            {/* Following */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-purple-500" />
                <span>Following</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.following_count?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.following_count?.value || 0, userInsights?.following_count?.previous || 0)}
            </div>

            {/* Total Likes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Total Likes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.likes_count?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.likes_count?.value || 0, userInsights?.likes_count?.previous || 0)}
            </div>

            {/* Videos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Play className="h-4 w-4 text-blue-500" />
                <span>Videos</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.video_count?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.video_count?.value || 0, userInsights?.video_count?.previous || 0)}
            </div>

            {/* Total Views */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4 text-green-500" />
                <span>Total Views</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalViews)}
              </p>
            </div>

            {/* Engagement */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4 text-orange-500" />
                <span>Engagement</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(totalEngagement)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Videos */}
      {recentVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Videos
            </CardTitle>
            <CardDescription>
              Your best videos based on engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentVideos.slice(0, 3).map((video, index) => {
                const totalEngagement = video.totalEngagement
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
                  <div key={video.id} className="flex items-start gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                      index === 0 && "bg-gradient-to-r from-yellow-400 to-orange-400",
                      index === 1 && "bg-gradient-to-r from-gray-400 to-gray-500",
                      index === 2 && "bg-gradient-to-r from-orange-400 to-orange-500"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 line-clamp-2">{video.title || video.description || 'Untitled Video'}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{formatNumber(totalEngagement)} engagements</span>
                        <span>{formatNumber(video.metrics?.views || 0)} views</span>
                        <span>{formatDate(video.created_time)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Videos Performance */}
      <Card className="overflow-hidden border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-cyan-100 to-pink-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-cyan-600" />
            </div>
            <span className="text-gray-900 font-bold">
              Recent Videos Performance
            </span>
            {selectedAccount && (
              <Badge className="ml-2 text-xs bg-gray-100 text-gray-700 border-gray-300">
                @{selectedAccount.username || selectedAccount.platform_user_id}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-gray-600 mt-1">
            Engagement metrics for your latest TikTok videos
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 relative">
          {/* Loading overlay for videos section */}
          {switchingAccount && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-cyan-600" />
                <p className="text-sm text-gray-600 font-medium">Loading videos...</p>
              </div>
            </div>
          )}
          {recentVideos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="mx-auto h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">No recent videos with insights available</p>
              <p className="text-xs mt-1">Post videos to see performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentVideos.map((video) => {
                const totalEngagement = video.totalEngagement

                return (
                  <div
                    key={video.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {/* Video Thumbnail - 64x64px */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                        {video.cover_image_url ? (
                          <img
                            src={video.cover_image_url}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-100 to-pink-200 flex items-center justify-center">
                            <Music className="h-8 w-8 text-cyan-600" />
                          </div>
                        )}
                      </div>

                      {/* Video Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-sm line-clamp-2 flex-1">
                            {video.title || video.description || 'Untitled Video'}
                          </h4>
                          <div className="ml-2 flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-pink-600 text-white px-3 py-1 rounded-full">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs font-semibold">{formatNumber(totalEngagement)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(video.created_time).toLocaleDateString('en-US', {
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
                          <span className="text-xs font-semibold">{formatNumber(video.metrics?.likes || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Likes</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                          <MessageCircle className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(video.metrics?.comments || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Comments</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                          <Share2 className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(video.metrics?.shares || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Shares</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(video.metrics?.views || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Views</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {hasMoreVideos && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setLoadingMore(true)
                  const newLimit = videosLimit + 5
                  setVideosLimit(newLimit)
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
                    Load More Videos
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

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  MessageCircle,
  Eye,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Info,
  Youtube,
  ChevronDown,
  Play,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface YouTubeMetrics {
  views: number
  likes: number
  comments: number
}

interface YouTubeVideo {
  id: string
  title: string
  description?: string
  created_time: string
  thumbnail_url?: string
  views: number
  likes: number
  comments: number
  shares: number
  totalEngagement: number
}

interface YouTubeInsightsProps {
  className?: string
}

export function YouTubeInsights({ className }: YouTubeInsightsProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [channelStats, setChannelStats] = useState<any>(null)
  const [recentVideos, setRecentVideos] = useState<YouTubeVideo[]>([])
  const [hasYouTubeAccount, setHasYouTubeAccount] = useState(false)
  const [youtubeAccounts, setYouTubeAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [videosLimit, setVideosLimit] = useState(5)
  const [hasMoreVideos, setHasMoreVideos] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [switchingAccount, setSwitchingAccount] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')

  const fetchYouTubeInsights = async (accountId?: string) => {
    try {
      setLoading(true)

      console.log(`[YouTube Insights] fetchYouTubeInsights called with accountId: ${accountId}`)

      // Check if YouTube account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (!accountResponse.ok) {
        return
      }

      const accounts = await accountResponse.json()
      const youtubeAccountsList = accounts.filter((acc: any) => acc.platform === 'youtube' && acc.is_active)

      if (youtubeAccountsList.length === 0) {
        setHasYouTubeAccount(false)
        return
      }

      setHasYouTubeAccount(true)
      setYouTubeAccounts(youtubeAccountsList)

      // Select account to use
      const accountToUse = accountId
        ? youtubeAccountsList.find((acc: any) => acc.id === accountId)
        : selectedAccount
        || youtubeAccountsList[0]

      setSelectedAccount(accountToUse)

      // Fetch analytics data from our YouTube analytics endpoint
      const analyticsResponse = await fetch(`/api/analytics/youtube?days=30`)

      if (analyticsResponse.ok) {
        const data = await analyticsResponse.json()
        console.log('YouTube analytics data received:', data)

        if (data.metrics) {
          // Set videos
          setRecentVideos(data.metrics.posts || [])
          setHasMoreVideos(data.metrics.posts.length >= videosLimit)

          // Calculate channel stats from videos
          const totalViews = data.metrics.totalViews || 0
          const totalEngagement = data.metrics.totalEngagement || 0
          const totalPosts = data.metrics.totalPosts || 0

          // Estimate stats
          setChannelStats({
            subscriberCount: 0, // Would need separate API call
            viewCount: totalViews,
            videoCount: totalPosts,
            commentCount: data.metrics.posts.reduce((sum: number, v: any) => sum + (v.comments || 0), 0),
            likeCount: data.metrics.posts.reduce((sum: number, v: any) => sum + (v.likes || 0), 0)
          })

          setTokenExpired(false)
        }
      } else {
        const errorData = await analyticsResponse.json()
        console.error(`[YouTube Insights] Failed to fetch analytics`)
        if (errorData.error?.includes('authentication') || errorData.error?.includes('token')) {
          setTokenExpired(true)
        }
        setRecentVideos([])
        setHasMoreVideos(false)
      }
    } catch (error) {
      console.error('Error fetching YouTube insights:', error)
      toast.error('Failed to load YouTube insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(() => {
      fetchYouTubeInsights()
    }, 100)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videosLimit])

  const handleRefresh = async () => {
    setRefreshing(true)
    fetchYouTubeInsights()
  }

  if (!hasYouTubeAccount) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5" />
            YouTube Insights
          </CardTitle>
          <CardDescription>
            Connect your YouTube account to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Youtube className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No YouTube account connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect YouTube
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
            <Youtube className="h-5 w-5" />
            YouTube Token Expired
          </CardTitle>
          <CardDescription className="text-orange-700">
            Your YouTube connection has expired and needs to be refreshed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 text-orange-400 mb-4 flex items-center justify-center">
              <RefreshCw className="h-8 w-8" />
            </div>
            <p className="text-sm text-orange-700 mb-4">
              YouTube requires periodic re-authentication for security.
              Please reconnect your account to continue viewing insights.
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.href = '/dashboard/settings'}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reconnect YouTube Account
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && !channelStats) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5" />
            YouTube Insights
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

  // Calculate total engagement from videos
  const totalEngagement = recentVideos.reduce((sum, video) => sum + video.totalEngagement, 0)
  const totalViews = recentVideos.reduce((sum, video) => sum + (video.views || 0), 0)
  const engagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : '0.00'

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
                    <Youtube className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    Channel Overview
                  </CardTitle>
                  {selectedAccount && (
                    <Badge variant="outline" className="self-start sm:self-auto text-xs">
                      @{selectedAccount.username || selectedAccount.platform_user_id}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs sm:text-sm">
                  Your YouTube channel performance metrics
                </CardDescription>
              </div>

              {/* Refresh Button - Top right on desktop */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:flex-shrink-0">
                {youtubeAccounts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <select
                      className={cn(
                        "text-xs sm:text-sm border rounded-lg px-3 py-1.5 bg-white flex-1 sm:flex-initial",
                        switchingAccount && "opacity-60 cursor-wait"
                      )}
                      value={selectedAccount?.id || ''}
                      onChange={async (e) => {
                        const account = youtubeAccounts.find(acc => acc.id === e.target.value)
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
                          await fetchYouTubeInsights(account.id)

                          clearTimeout(timeoutId)
                          setSwitchingAccount(false)
                          setLoadingMessage('')
                          toast.success('Analytics loaded successfully')
                        }
                      }}
                      disabled={switchingAccount}
                    >
                      {youtubeAccounts.map(account => (
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
                <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
                <p className="text-sm text-gray-600 font-medium">{loadingMessage || 'Loading...'}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Videos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Play className="h-4 w-4 text-red-500" />
                <span>Videos</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(channelStats?.videoCount || 0)}
              </p>
            </div>

            {/* Total Views */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4 text-blue-500" />
                <span>Total Views</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(channelStats?.viewCount || 0)}
              </p>
            </div>

            {/* Total Likes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Likes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(channelStats?.likeCount || 0)}
              </p>
            </div>

            {/* Total Comments */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageCircle className="h-4 w-4 text-purple-500" />
                <span>Comments</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(channelStats?.commentCount || 0)}
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

            {/* Engagement Rate */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Eng. Rate</span>
              </div>
              <p className="text-2xl font-bold">
                {engagementRate}%
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
                      <p className="text-sm text-gray-700 line-clamp-2">{video.title || 'Untitled Video'}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{formatNumber(totalEngagement)} engagements</span>
                        <span>{formatNumber(video.views || 0)} views</span>
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
          <div className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              </div>
              <span className="text-gray-900 font-bold">
                Recent Videos Performance
              </span>
            </CardTitle>
            {selectedAccount && (
              <Badge className="self-start text-xs bg-gray-100 text-gray-700 border-gray-300">
                @{selectedAccount.username || selectedAccount.platform_user_id}
              </Badge>
            )}
            <CardDescription className="text-gray-600 text-xs sm:text-sm">
              Engagement metrics for your latest YouTube videos
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 relative">
          {/* Loading overlay for videos section */}
          {switchingAccount && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
                <p className="text-sm text-gray-600 font-medium">Loading videos...</p>
              </div>
            </div>
          )}
          {recentVideos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="mx-auto h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">No recent videos with insights available</p>
              <p className="text-xs mt-1">Upload videos to see performance metrics</p>
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
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden relative">
                        {video.thumbnail_url ? (
                          <>
                            <img
                              src={video.thumbnail_url}
                              alt="Video thumbnail"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                            <Youtube className="h-8 w-8 text-red-600" />
                          </div>
                        )}
                      </div>

                      {/* Video Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-sm line-clamp-2 flex-1">
                            {video.title || 'Untitled Video'}
                          </h4>
                          <div className="ml-2 flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full">
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

                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                          <Heart className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(video.likes || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Likes</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                          <MessageCircle className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(video.comments || 0)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Comments</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs font-semibold">{formatNumber(video.views || 0)}</span>
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
                onClick={() => {
                  const newLimit = videosLimit + 5
                  setVideosLimit(newLimit)
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

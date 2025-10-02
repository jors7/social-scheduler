'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  MessageCircle,
  Repeat2,
  Quote,
  Eye,
  Users,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Cloud,
  AtSign
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BlueskyPost {
  id: string
  text?: string
  uri: string
  createdAt: string
  likes: number
  reposts: number
  replies: number
  quotes: number
}

interface BlueskyMetrics {
  totalPosts: number
  totalEngagement: number
  totalReach: number
  posts: BlueskyPost[]
}

interface BlueskyInsightsProps {
  className?: string
}

export function BlueskyInsights({ className }: BlueskyInsightsProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [metrics, setMetrics] = useState<BlueskyMetrics | null>(null)
  const [hasBlueskyAccount, setHasBlueskyAccount] = useState(false)

  const fetchBlueskyInsights = async () => {
    try {
      setLoading(true)

      // Fetch analytics from the working endpoint
      const response = await fetch('/api/analytics/bluesky?days=30')

      if (!response.ok) {
        if (response.status === 401) {
          setHasBlueskyAccount(false)
          return
        }
        throw new Error('Failed to fetch Bluesky analytics')
      }

      const data = await response.json()

      if (data.metrics && data.metrics.totalPosts > 0) {
        setMetrics(data.metrics)
        setHasBlueskyAccount(true)
      } else {
        setHasBlueskyAccount(false)
      }
    } catch (error) {
      console.error('Error fetching Bluesky insights:', error)
      toast.error('Failed to load Bluesky insights')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBlueskyInsights()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchBlueskyInsights()
  }

  if (!hasBlueskyAccount && !loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Bluesky Insights
          </CardTitle>
          <CardDescription>
            Connect your Bluesky account to view insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Cloud className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No Bluesky account connected
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/settings'}>
              Connect Bluesky
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && !metrics) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Bluesky Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
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

  // Calculate total metrics
  const totalLikes = metrics?.posts.reduce((sum, post) => sum + post.likes, 0) || 0
  const totalReposts = metrics?.posts.reduce((sum, post) => sum + post.reposts, 0) || 0
  const totalReplies = metrics?.posts.reduce((sum, post) => sum + post.replies, 0) || 0
  const totalQuotes = metrics?.posts.reduce((sum, post) => sum + post.quotes, 0) || 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AtSign className="h-5 w-5" />
                Bluesky Overview
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  Last 30 days
                </Badge>
              </CardTitle>
              <CardDescription>
                Performance metrics for your Bluesky account
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Likes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Likes</span>
              </div>
              <div className="text-2xl font-bold">{formatNumber(totalLikes)}</div>
            </div>

            {/* Reposts */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Repeat2 className="h-4 w-4 text-green-500" />
                <span>Reposts</span>
              </div>
              <div className="text-2xl font-bold">{formatNumber(totalReposts)}</div>
            </div>

            {/* Replies */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                <span>Replies</span>
              </div>
              <div className="text-2xl font-bold">{formatNumber(totalReplies)}</div>
            </div>

            {/* Quotes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Quote className="h-4 w-4 text-purple-500" />
                <span>Quotes</span>
              </div>
              <div className="text-2xl font-bold">{formatNumber(totalQuotes)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts Performance */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Posts Performance
          </CardTitle>
          <CardDescription>
            Your top performing Bluesky posts from the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {metrics && metrics.posts.length > 0 ? (
            <div className="grid gap-4">
              {metrics.posts.slice(0, 10).map((post) => {
                const totalEngagement = post.likes + post.reposts + post.replies + post.quotes
                const postText = post.text || 'No text content'
                const truncatedText = postText.length > 80 ? postText.substring(0, 80) + '...' : postText
                const postDate = new Date(post.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })

                return (
                  <div
                    key={post.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <AtSign className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2 mb-1">{truncatedText}</p>
                        <p className="text-xs text-gray-500">{postDate}</p>
                      </div>
                      <div className="ml-2 flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-xs font-semibold">{formatNumber(totalEngagement)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {/* Likes */}
                      <div className="text-center">
                        <div className="flex justify-center mb-1">
                          <Heart className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="text-sm font-semibold">{formatNumber(post.likes)}</div>
                        <div className="text-xs text-gray-500">Likes</div>
                      </div>

                      {/* Reposts */}
                      <div className="text-center">
                        <div className="flex justify-center mb-1">
                          <Repeat2 className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-sm font-semibold">{formatNumber(post.reposts)}</div>
                        <div className="text-xs text-gray-500">Reposts</div>
                      </div>

                      {/* Replies */}
                      <div className="text-center">
                        <div className="flex justify-center mb-1">
                          <MessageCircle className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-sm font-semibold">{formatNumber(post.replies)}</div>
                        <div className="text-xs text-gray-500">Replies</div>
                      </div>

                      {/* Quotes */}
                      <div className="text-center">
                        <div className="flex justify-center mb-1">
                          <Quote className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="text-sm font-semibold">{formatNumber(post.quotes)}</div>
                        <div className="text-xs text-gray-500">Quotes</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <AtSign className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm text-gray-500">
                No posts found in the last 30 days
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

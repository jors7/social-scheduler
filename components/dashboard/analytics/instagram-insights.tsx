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
  Camera
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

  const fetchInstagramInsights = async () => {
    try {
      setLoading(true)
      
      // Check if Instagram account is connected
      const accountResponse = await fetch('/api/social-accounts')
      if (accountResponse.ok) {
        const accounts = await accountResponse.json()
        const instagramAccount = accounts.find((acc: any) => acc.platform === 'instagram' && acc.is_active)
        
        if (!instagramAccount) {
          setHasInstagramAccount(false)
          return
        }
        
        setHasInstagramAccount(true)
      }

      // Fetch user-level insights
      const userInsightsResponse = await fetch(`/api/instagram/insights?type=user&period=${selectedPeriod}`)
      if (userInsightsResponse.ok) {
        const data = await userInsightsResponse.json()
        setUserInsights(data.insights)
      }

      // Fetch recent posts with insights
      const postsResponse = await fetch('/api/posts/schedule')
      if (postsResponse.ok) {
        const { posts } = await postsResponse.json()
        const instagramPosts = posts
          .filter((post: any) => 
            post.status === 'posted' && 
            post.post_results?.some((r: any) => r.platform === 'instagram' && r.success)
          )
          .slice(0, 5) // Get last 5 Instagram posts

        // Fetch insights for each post
        const postsWithInsights = await Promise.all(
          instagramPosts.map(async (post: any) => {
            const instagramResult = post.post_results.find((r: any) => r.platform === 'instagram')
            if (instagramResult?.data?.id) {
              try {
                const insightsResponse = await fetch(`/api/instagram/insights?mediaId=${instagramResult.data.id}&type=media`)
                if (insightsResponse.ok) {
                  const { insights } = await insightsResponse.json()
                  return {
                    id: post.id,
                    media_id: instagramResult.data.id,
                    caption: post.content,
                    media_type: 'IMAGE',
                    timestamp: post.posted_at,
                    metrics: {
                      impressions: insights.impressions?.value || 0,
                      reach: insights.reach?.value || 0,
                      saves: insights.saved?.value || 0,
                      likes: insights.likes?.value || 0,
                      comments: insights.comments?.value || 0,
                      shares: insights.shares?.value || 0,
                      engagement: insights.engagement?.value || 0,
                      profile_views: 0,
                      follower_count: 0
                    }
                  }
                }
              } catch (error) {
                console.error('Error fetching post insights:', error)
              }
            }
            return null
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
    fetchInstagramInsights()
  }, [selectedPeriod])

  const handleRefresh = () => {
    setRefreshing(true)
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Instagram Insights
              </CardTitle>
              <CardDescription>
                Performance metrics for your Instagram Business account
              </CardDescription>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Impressions */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>Impressions</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.impressions?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.impressions?.value || 0, userInsights?.impressions?.previous || 0)}
            </div>

            {/* Reach */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Reach</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.reach?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.reach?.value || 0, userInsights?.reach?.previous || 0)}
            </div>

            {/* Profile Views */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4" />
                <span>Profile Views</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(userInsights?.profile_views?.value || 0)}
              </p>
              {getChangeIndicator(userInsights?.profile_views?.value || 0, userInsights?.profile_views?.previous || 0)}
            </div>

            {/* Follower Count */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
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

      {/* Recent Posts Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Posts Performance
          </CardTitle>
          <CardDescription>
            Engagement metrics for your latest Instagram posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="mx-auto h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">No recent posts with insights available</p>
              <p className="text-xs mt-1">Post content to see performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {post.caption.replace(/<[^>]*>/g, '').slice(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(post.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {post.media_type}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-gray-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.impressions || 0)}</span>
                      <span className="text-xs text-gray-500">impressions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.reach || 0)}</span>
                      <span className="text-xs text-gray-500">reach</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.likes || 0)}</span>
                      <span className="text-xs text-gray-500">likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-blue-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.comments || 0)}</span>
                      <span className="text-xs text-gray-500">comments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bookmark className="h-3 w-3 text-purple-500" />
                      <span className="font-medium">{formatNumber(post.metrics?.saves || 0)}</span>
                      <span className="text-xs text-gray-500">saves</span>
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
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  Users, 
  TrendingUp,
  BarChart3,
  Camera,
  AtSign,
  Facebook,
  Linkedin,
  Twitter,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AllPlatformsOverviewProps {
  connectedPlatforms: string[]
  className?: string
}

interface PlatformMetrics {
  platform: string
  posts: number
  totalEngagement: number
  totalReach: number
  likes: number
  comments: number
  shares: number
  views?: number
  replies?: number
  reposts?: number
  quotes?: number
}

export function AllPlatformsOverview({ connectedPlatforms, className }: AllPlatformsOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics[]>([])
  const [totalMetrics, setTotalMetrics] = useState({
    posts: 0,
    engagement: 0,
    reach: 0,
    likes: 0,
    comments: 0,
    shares: 0
  })

  useEffect(() => {
    fetchAllPlatformMetrics()
    // Set up an interval to refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchAllPlatformMetrics()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [connectedPlatforms.join(',')])

  const fetchAllPlatformMetrics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      // Fetch all posts - add cache busting to ensure fresh data
      const [draftsResponse, scheduledResponse] = await Promise.all([
        fetch('/api/drafts?t=' + Date.now()),
        fetch('/api/posts/schedule?t=' + Date.now())
      ])
      
      if (!draftsResponse.ok || !scheduledResponse.ok) {
        throw new Error('Failed to fetch posts data')
      }
      
      const [draftsData, scheduledData] = await Promise.all([
        draftsResponse.json(),
        scheduledResponse.json()
      ])
      
      const drafts = draftsData.drafts || []
      const scheduled = scheduledData.posts || []
      const allPosts = [...drafts, ...scheduled]
      const postedPosts = scheduled.filter((post: any) => post.status === 'posted')
      
      console.log('All Platforms Overview - Posts count:', {
        drafts: drafts.length,
        scheduled: scheduled.length,
        posted: postedPosts.length,
        total: allPosts.length
      })
      
      // Calculate metrics by platform
      const metricsMap = new Map<string, PlatformMetrics>()
      
      postedPosts.forEach((post: any) => {
        if (post.post_results && Array.isArray(post.post_results)) {
          post.post_results.forEach((result: any) => {
            if (result.success && result.data) {
              const platform = result.platform.toLowerCase()
              
              if (!metricsMap.has(platform)) {
                metricsMap.set(platform, {
                  platform,
                  posts: 0,
                  totalEngagement: 0,
                  totalReach: 0,
                  likes: 0,
                  comments: 0,
                  shares: 0,
                  views: 0,
                  replies: 0,
                  reposts: 0,
                  quotes: 0
                })
              }
              
              const metrics = metricsMap.get(platform)!
              metrics.posts++
              
              if (result.data.metrics) {
                const m = result.data.metrics
                metrics.likes += m.likes || 0
                metrics.comments += m.comments || 0
                metrics.shares += m.shares || 0
                metrics.views = (metrics.views || 0) + (m.views || 0)
                metrics.replies = (metrics.replies || 0) + (m.replies || 0)
                metrics.reposts = (metrics.reposts || 0) + (m.reposts || 0)
                metrics.quotes = (metrics.quotes || 0) + (m.quotes || 0)
                
                // Calculate engagement based on platform
                if (platform === 'threads') {
                  metrics.totalEngagement += (m.likes || 0) + (m.replies || 0) + (m.reposts || 0) + (m.quotes || 0) + (m.shares || 0)
                } else {
                  metrics.totalEngagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0)
                }
                
                metrics.totalReach += m.views || m.impressions || m.reach || 0
              }
            }
          })
        }
      })
      
      const platformMetricsArray = Array.from(metricsMap.values())
      setPlatformMetrics(platformMetricsArray)
      
      // Calculate totals
      // For posts, count the actual number of posted posts, not the number of successful results
      const totalPostsCount = postedPosts.length
      
      const totals = platformMetricsArray.reduce((acc, pm) => ({
        posts: totalPostsCount, // Use actual posted posts count
        engagement: acc.engagement + pm.totalEngagement,
        reach: acc.reach + pm.totalReach,
        likes: acc.likes + pm.likes,
        comments: acc.comments + pm.comments + (pm.replies || 0),
        shares: acc.shares + pm.shares + (pm.reposts || 0)
      }), { posts: totalPostsCount, engagement: 0, reach: 0, likes: 0, comments: 0, shares: 0 })
      
      setTotalMetrics(totals)
      
    } catch (error) {
      console.error('Error fetching platform metrics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Camera className="h-5 w-5" />
      case 'threads':
        return <AtSign className="h-5 w-5" />
      case 'facebook':
        return <Facebook className="h-5 w-5" />
      case 'linkedin':
        return <Linkedin className="h-5 w-5" />
      case 'twitter':
      case 'x':
        return <Twitter className="h-5 w-5" />
      default:
        return <BarChart3 className="h-5 w-5" />
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return 'from-purple-500 to-pink-500'
      case 'threads':
        return 'from-gray-700 to-black'
      case 'facebook':
        return 'from-blue-500 to-blue-600'
      case 'linkedin':
        return 'from-blue-600 to-blue-700'
      case 'twitter':
      case 'x':
        return 'from-gray-600 to-black'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Combined Metrics Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                All Platforms Combined
              </CardTitle>
              <CardDescription className="mt-1">
                Aggregated metrics across all your connected platforms
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAllPlatformMetrics(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BarChart3 className="h-4 w-4" />
                <span>Total Posts</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.posts)}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>Engagement</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.engagement)}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>Reach</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.reach)}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4" />
                <span>Likes</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.likes)}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageCircle className="h-4 w-4" />
                <span>Comments</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.comments)}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Share2 className="h-4 w-4" />
                <span>Shares</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.shares)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance Breakdown</CardTitle>
          <CardDescription>
            Individual performance metrics for each platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {platformMetrics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No posted content to analyze yet</p>
              <p className="text-xs mt-1">Start posting to see platform breakdowns</p>
            </div>
          ) : (
            <div className="space-y-4">
              {platformMetrics.map((pm) => (
                <div key={pm.platform} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-r text-white",
                        getPlatformColor(pm.platform)
                      )}>
                        {getPlatformIcon(pm.platform)}
                      </div>
                      <div>
                        <h4 className="font-semibold capitalize">{pm.platform}</h4>
                        <p className="text-sm text-gray-500">{pm.posts} posts</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {formatNumber(pm.totalEngagement)} engagement
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Reach</span>
                      <p className="font-medium">{formatNumber(pm.totalReach)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Likes</span>
                      <p className="font-medium">{formatNumber(pm.likes)}</p>
                    </div>
                    {pm.platform === 'threads' ? (
                      <>
                        <div>
                          <span className="text-gray-500">Replies</span>
                          <p className="font-medium">{formatNumber(pm.replies || 0)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Reposts</span>
                          <p className="font-medium">{formatNumber(pm.reposts || 0)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Quotes</span>
                          <p className="font-medium">{formatNumber(pm.quotes || 0)}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-gray-500">Comments</span>
                          <p className="font-medium">{formatNumber(pm.comments)}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-gray-500">Shares</span>
                      <p className="font-medium">{formatNumber(pm.shares)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {platformMetrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Best Performing Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const best = platformMetrics.reduce((prev, current) => 
                  current.totalEngagement > prev.totalEngagement ? current : prev
                )
                return (
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg bg-gradient-to-r text-white",
                      getPlatformColor(best.platform)
                    )}>
                      {getPlatformIcon(best.platform)}
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{best.platform}</p>
                      <p className="text-sm text-gray-500">{formatNumber(best.totalEngagement)} total engagement</p>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Most Active Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const mostActive = platformMetrics.reduce((prev, current) => 
                  current.posts > prev.posts ? current : prev
                )
                return (
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg bg-gradient-to-r text-white",
                      getPlatformColor(mostActive.platform)
                    )}>
                      {getPlatformIcon(mostActive.platform)}
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{mostActive.platform}</p>
                      <p className="text-sm text-gray-500">{mostActive.posts} posts published</p>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
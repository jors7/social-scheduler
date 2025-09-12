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
  RefreshCw,
  Activity
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
      
      // Initialize all platforms with zero metrics
      const allPlatforms = ['facebook', 'instagram', 'threads', 'twitter', 'linkedin', 'bluesky', 'pinterest', 'tiktok', 'youtube']
      const metricsMap = new Map<string, PlatformMetrics>()
      
      // Initialize all platforms
      allPlatforms.forEach(platform => {
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
      })
      
      // Update metrics for platforms with posted content
      postedPosts.forEach((post: any) => {
        if (post.post_results && Array.isArray(post.post_results)) {
          post.post_results.forEach((result: any) => {
            if (result.success && result.data) {
              const platform = result.platform.toLowerCase()
              
              const metrics = metricsMap.get(platform)
              if (metrics) {
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
      case 'bluesky':
        return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      case 'pinterest':
        return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 4.3 2.7 7.9 6.4 9.3-.1-.8-.2-2 0-2.9.2-.8 1.3-5.4 1.3-5.4s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.6 2 1.7 2 2 0 3.5-2.1 3.5-5.2 0-2.7-2-4.6-4.8-4.6-3.3 0-5.2 2.5-5.2 5 0 1 .4 2.1.9 2.7.1.1.1.2.1.3-.1.4-.3 1.1-.3 1.3-.1.2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.4 0-3.6 2.6-6.9 7.5-6.9 3.9 0 7 2.8 7 6.6 0 3.9-2.5 7.1-5.9 7.1-1.2 0-2.3-.6-2.6-1.3l-.7 2.8c-.3 1-1 2.3-1.5 3.1 1.1.3 2.3.5 3.5.5 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
        </svg>
      case 'tiktok':
        return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 12 3v8.5a4.5 4.5 0 1 1-3-4.24v3.1a1.5 1.5 0 1 0 0 2.14V3h3a6.5 6.5 0 0 0 6.5 6.5V6.5A3.5 3.5 0 0 0 19 3z"/>
        </svg>
      case 'youtube':
        return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.5 6.2s-.2-1.7-1-2.4c-.9-1-1.9-1-2.4-1C16.9 2.5 12 2.5 12 2.5s-4.9 0-8.1.3c-.5.1-1.5.1-2.4 1-.7.7-1 2.4-1 2.4S.2 8.1.2 10v1.8c0 1.9.3 3.8.3 3.8s.2 1.7 1 2.4c.9 1 2.1.9 2.6 1 1.9.2 7.9.2 7.9.2s4.9 0 8.1-.3c.5-.1 1.5-.1 2.4-1 .7-.7 1-2.4 1-2.4s.3-1.9.3-3.8V10c-.1-1.9-.3-3.8-.3-3.8zM9.5 15.5V8.5l6.5 3.5-6.5 3.5z"/>
        </svg>
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
      case 'bluesky':
        return 'from-sky-400 to-blue-500'
      case 'pinterest':
        return 'from-red-500 to-red-600'
      case 'tiktok':
        return 'from-gray-900 to-black'
      case 'youtube':
        return 'from-red-600 to-red-700'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }
  
  const platformsWithReach = ['facebook', 'instagram', 'threads'] // Platforms that have reach metrics

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
          
          {/* Info Box */}
          <div className="mt-4 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="mt-0.5">
              <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-900 leading-relaxed">
                <span className="font-medium">Why are some metrics limited?</span>
                <br />
                These numbers represent aggregated data from platforms with available analytics APIs. Currently, Facebook, Instagram, and Threads provide reach metrics, while other platforms are still developing their analytics capabilities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Platform Performance Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Platform Performance
          </CardTitle>
          <CardDescription>
            Posts published and reach by platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3 min-w-max md:min-w-0">
              {platformMetrics.sort((a, b) => {
                // Sort by posts first, then by platform name for consistency
                if (b.posts !== a.posts) return b.posts - a.posts
                return a.platform.localeCompare(b.platform)
              }).map((pm) => (
                <div 
                  key={pm.platform} 
                  className="flex flex-col items-center group"
                >
                  {/* Platform Icon */}
                  <div className={cn(
                    "p-2.5 rounded-lg bg-gradient-to-br text-white mb-2 transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg",
                    getPlatformColor(pm.platform)
                  )}>
                    {getPlatformIcon(pm.platform)}
                  </div>
                  
                  {/* Platform Name */}
                  <p className="text-[11px] font-medium text-gray-700 capitalize mb-1.5">
                    {pm.platform}
                  </p>
                  
                  {/* Metrics Row */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-md px-2 py-1">
                    {/* Posts */}
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">
                        {pm.posts || 0}
                      </p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">
                        Posts
                      </p>
                    </div>
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300"></div>
                    
                    {/* Reach */}
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">
                        {platformsWithReach.includes(pm.platform.toLowerCase()) && pm.totalReach > 0 
                          ? formatNumber(pm.totalReach) 
                          : '-'}
                      </p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">
                        Reach
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
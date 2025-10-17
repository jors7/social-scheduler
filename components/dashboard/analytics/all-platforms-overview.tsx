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
  Activity,
  Clock,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AllPlatformsOverviewProps {
  connectedPlatforms: string[]
  className?: string
  days?: number // Date range in days (default: 7)
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
  saves?: number
  clicks?: number
  impressions?: number
}

// Enhanced in-memory cache with platform-specific caching
const metricsCache = {
  data: null as any,
  timestamp: 0,
  days: 0, // Track which days parameter the cached data is for
  TTL: 30 * 60 * 1000, // 30 minutes cache for better performance
  platformData: new Map<string, { data: any, timestamp: number, error?: string }>()
}

export function AllPlatformsOverview({ connectedPlatforms, className, days = 30 }: AllPlatformsOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [platformErrors, setPlatformErrors] = useState<Record<string, string>>({})
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
  }, [connectedPlatforms.join(','), days])

  const fetchAllPlatformMetrics = async (isRefresh = false) => {
    try {
      // Check cache first (unless it's a manual refresh)
      // Cache is only valid if TTL hasn't expired AND days parameter matches
      const cacheValid = !isRefresh &&
                        metricsCache.data &&
                        (Date.now() - metricsCache.timestamp < metricsCache.TTL) &&
                        metricsCache.days === days;

      if (cacheValid) {
        // Use cached data
        setPlatformMetrics(metricsCache.data.platformMetrics)
        setTotalMetrics(metricsCache.data.totalMetrics)
        setLastUpdated(new Date(metricsCache.timestamp))
        setLoading(false)
        return
      }

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      // Fetch real-time data from platform analytics APIs with smart caching
      const fetchWithCache = async (platform: string, url: string) => {
        try {
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            // Cache successful response
            metricsCache.platformData.set(platform, {
              data,
              timestamp: Date.now()
            })
            return data
          } else {
            // Try to use cached data if available
            const cached = metricsCache.platformData.get(platform)
            if (cached && (Date.now() - cached.timestamp < metricsCache.TTL)) {
              console.log(`Using cached data for ${platform} due to API error`)
              return cached.data
            }
            return { metrics: null, error: `Failed to fetch ${platform} data` }
          }
        } catch (error) {
          // Try to use cached data on network error
          const cached = metricsCache.platformData.get(platform)
          if (cached && (Date.now() - cached.timestamp < metricsCache.TTL)) {
            console.log(`Using cached data for ${platform} due to network error`)
            return cached.data
          }
          return { metrics: null, error: `Network error for ${platform}` }
        }
      }
      
      const [facebookData, instagramData, threadsData, blueskyData, pinterestData, tiktokData] = await Promise.all([
        fetchWithCache('facebook', `/api/analytics/facebook?days=${days}`),
        fetchWithCache('instagram', `/api/analytics/instagram?days=${days}`),
        fetchWithCache('threads', `/api/analytics/threads?days=${days}`),
        fetchWithCache('bluesky', `/api/analytics/bluesky?days=${days}`),
        fetchWithCache('pinterest', `/api/analytics/pinterest?days=${days}`),
        fetchWithCache('tiktok', `/api/analytics/tiktok?days=${days}`)
      ])
      
      // Track errors for display
      const errors: Record<string, string> = {}
      
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
      
      // Process Facebook data
      if (facebookData.metrics) {
        const metrics = metricsMap.get('facebook')!
        const m = facebookData.metrics
        metrics.posts = m.totalPosts
        metrics.totalEngagement = m.totalEngagement
        metrics.totalReach = m.totalReach
        
        // Aggregate metrics from posts
        m.posts.forEach((post: any) => {
          metrics.likes += post.likes || 0
          metrics.comments += post.comments || 0
          metrics.shares += post.shares || 0
        })
      } else if (facebookData.error) {
        errors.facebook = 'Unable to load Facebook data'
      }
      
      // Process Instagram data
      if (instagramData.metrics) {
        const metrics = metricsMap.get('instagram')!
        const m = instagramData.metrics
        metrics.posts = m.totalPosts
        metrics.totalEngagement = m.totalEngagement
        metrics.totalReach = m.totalReach
        
        // Aggregate metrics from posts
        m.posts.forEach((post: any) => {
          metrics.likes += post.likes || 0
          metrics.comments += post.comments || 0
          metrics.shares += post.saves || 0 // Instagram uses saves as shares
        })
      } else if (instagramData.error) {
        errors.instagram = 'Token expired - reconnect needed'
      }
      
      // Process Threads data
      if (threadsData.metrics) {
        const metrics = metricsMap.get('threads')!
        const m = threadsData.metrics
        metrics.posts = m.totalPosts
        metrics.totalEngagement = m.totalEngagement
        metrics.totalReach = m.totalViews
        metrics.views = m.totalViews
        
        // Aggregate metrics from posts
        m.posts.forEach((post: any) => {
          metrics.likes += post.likes || 0
          metrics.replies = (metrics.replies || 0) + (post.replies || 0)
          metrics.reposts = (metrics.reposts || 0) + (post.reposts || 0)
          metrics.quotes = (metrics.quotes || 0) + (post.quotes || 0)
        })
        
        // For Threads, comments are replies
        metrics.comments = metrics.replies || 0
      }
      
      // Process Bluesky data
      if (blueskyData.metrics) {
        const metrics = metricsMap.get('bluesky')!
        const m = blueskyData.metrics
        metrics.posts = m.totalPosts
        metrics.totalEngagement = m.totalEngagement
        metrics.totalReach = m.totalReach

        // Aggregate metrics from posts
        m.posts.forEach((post: any) => {
          metrics.likes += post.likes || 0
          metrics.replies = (metrics.replies || 0) + (post.replies || 0)
          metrics.reposts = (metrics.reposts || 0) + (post.reposts || 0)
          metrics.quotes = (metrics.quotes || 0) + (post.quotes || 0)
        })

        // For Bluesky, comments are replies and shares are reposts
        metrics.comments = metrics.replies || 0
        metrics.shares = metrics.reposts || 0
      } else if (blueskyData.error) {
        errors.bluesky = 'Rate limited - try again later'
      }

      // Process Pinterest data
      if (pinterestData.metrics) {
        const metrics = metricsMap.get('pinterest')!
        const m = pinterestData.metrics
        metrics.posts = m.totalPosts
        metrics.totalEngagement = m.totalEngagement
        metrics.totalReach = m.totalImpressions || m.totalReach || 0 // Pinterest uses impressions as reach

        // Aggregate metrics from pins
        m.posts.forEach((pin: any) => {
          metrics.saves = (metrics.saves || 0) + (pin.saves || 0)
          metrics.clicks = (metrics.clicks || 0) + (pin.pin_clicks || 0)
          metrics.impressions = (metrics.impressions || 0) + (pin.impressions || 0)
        })

        // For Pinterest, engagement is saves + clicks
        metrics.likes = metrics.saves || 0 // Saves are like "likes"
        metrics.comments = metrics.clicks || 0 // Clicks show interest
      }

      // Process TikTok data
      if (tiktokData.metrics) {
        const metrics = metricsMap.get('tiktok')!
        const m = tiktokData.metrics
        metrics.posts = m.totalPosts
        metrics.totalEngagement = m.totalEngagement
        metrics.totalReach = m.totalReach
        metrics.views = m.totalViews

        // Aggregate metrics from videos
        m.posts.forEach((video: any) => {
          metrics.likes += video.likes || 0
          metrics.comments += video.comments || 0
          metrics.shares += video.shares || 0
        })
      } else if (tiktokData.error) {
        errors.tiktok = 'Unable to load TikTok data'
      }

      const platformMetricsArray = Array.from(metricsMap.values())
      setPlatformMetrics(platformMetricsArray)
      setPlatformErrors(errors)
      
      // Calculate totals
      const totals = platformMetricsArray.reduce((acc, pm) => ({
        posts: acc.posts + pm.posts,
        engagement: acc.engagement + pm.totalEngagement,
        reach: acc.reach + pm.totalReach,
        likes: acc.likes + pm.likes,
        comments: acc.comments + pm.comments,
        shares: acc.shares + pm.shares
      }), { posts: 0, engagement: 0, reach: 0, likes: 0, comments: 0, shares: 0 })
      
      setTotalMetrics(totals)
      
      // Update cache with days parameter
      metricsCache.data = {
        platformMetrics: platformMetricsArray,
        totalMetrics: totals
      }
      metricsCache.timestamp = Date.now()
      metricsCache.days = days // Store which days parameter this cache is for
      setLastUpdated(new Date())
      
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
          <path d="M12 3c-1.9 2.8-5.8 6.8-9 8.5 1.5.4 3.5.5 5 0-1.8 2.2-3.5 6.5-2 9 1.5-2.5 4-6 6-7 2 1 4.5 4.5 6 7 1.5-2.5-.2-6.8-2-9 1.5.5 3.5.4 5 0-3.2-1.7-7.1-5.7-9-8.5z"/>
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

  const getPlatformBackgroundClass = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return 'bg-purple-500'
      case 'threads':
        return 'bg-gray-700'
      case 'facebook':
        return 'bg-blue-500'
      case 'linkedin':
        return 'bg-blue-600'
      case 'twitter':
      case 'x':
        return 'bg-gray-600'
      case 'bluesky':
        return 'bg-sky-400'
      case 'pinterest':
        return 'bg-red-500'
      case 'tiktok':
        return 'bg-gray-900'
      case 'youtube':
        return 'bg-red-600'
      default:
        return 'bg-gray-500'
    }
  }
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading && !metricsCache.data) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="overflow-hidden">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-6">
              {/* Animated Loading Circle */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-gray-200"></div>
                <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                
                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="h-10 w-10 text-blue-500 animate-pulse" />
                </div>
              </div>
              
              {/* Loading Text */}
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Loading Analytics</h3>
                <p className="text-sm text-gray-500">Fetching data from your connected platforms...</p>
              </div>
              
              {/* Platform Icons */}
              <div className="flex space-x-3">
                {['facebook', 'instagram', 'threads', 'pinterest', 'bluesky', 'tiktok'].map((platform, index) => {
                  const icon = getPlatformIcon(platform)
                  const color = getPlatformColor(platform)

                  // Convert gradient color to solid background
                  const bgColorMap: Record<string, string> = {
                    'facebook': '#3b82f6',    // blue-500
                    'instagram': '#a855f7',   // purple-500
                    'threads': '#374151',     // gray-700
                    'pinterest': '#ef4444',   // red-500
                    'bluesky': '#38bdf8',     // sky-400
                    'tiktok': '#000000'       // black
                  }

                  return (
                    <div
                      key={platform}
                      data-platform={platform}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white animate-pulse"
                      style={{
                        animationDelay: `${index * 200}ms`,
                        backgroundColor: bgColorMap[platform] || '#6b7280'
                      }}
                    >
                      {icon}
                    </div>
                  )
                })}
              </div>
              
              {/* Progress Bar */}
              <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" 
                     style={{
                       animation: 'loading 2s ease-in-out infinite'
                     }}
                />
              </div>
              
              <style jsx>{`
                @keyframes loading {
                  0% { width: 0%; }
                  50% { width: 70%; }
                  100% { width: 100%; }
                }
              `}</style>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Combined Metrics Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            {/* Title and Refresh Button Row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex flex-col gap-2">
                {/* Title and Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    All Platforms Combined
                  </CardTitle>
                  <Badge variant="outline" className="self-start sm:self-auto text-xs font-normal bg-blue-50 text-blue-700 border-blue-200">
                    Last 30 days
                  </Badge>
                </div>
                <CardDescription className="text-xs sm:text-sm">
                  Aggregated metrics across all your connected platforms
                </CardDescription>
                {lastUpdated && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      Updated {new Date().getTime() - lastUpdated.getTime() < 60000
                        ? 'just now'
                        : `${Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000)} min ago`}
                    </span>
                  </div>
                )}
              </div>

              {/* Refresh Button - Top right on desktop */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAllPlatformMetrics(true)}
                disabled={refreshing}
                className="w-full sm:w-auto sm:flex-shrink-0"
              >
                <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span>Total Posts</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.posts)}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span>Engagement</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.engagement)}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4 text-green-600" />
                <span>Reach</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.reach)}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Heart className="h-4 w-4 text-red-600" />
                <span>Likes</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.likes)}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageCircle className="h-4 w-4 text-purple-600" />
                <span>Comments</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(totalMetrics.comments)}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Share2 className="h-4 w-4 text-teal-600" />
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
                These numbers represent aggregated data from platforms with available analytics APIs. Currently, Facebook, Instagram, Threads, Pinterest, TikTok, and Bluesky provide reach metrics, while other platforms are still developing their analytics capabilities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Platform Performance Grid */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                Platform Performance
              </CardTitle>
              <Badge variant="outline" className="self-start sm:self-auto text-xs font-normal bg-blue-50 text-blue-700 border-blue-200">
                Last 30 days
              </Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Posts published and reach by platform
            </CardDescription>
          </div>
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
                  className="flex flex-col items-center group relative"
                >
                  {/* Error indicator */}
                  {platformErrors[pm.platform] && (
                    <div className="absolute -top-1 -right-1 z-10">
                      <div className="relative group/tooltip">
                        <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                          {platformErrors[pm.platform]}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Platform Icon */}
                  <div className={cn(
                    "p-2.5 rounded-lg bg-gradient-to-br text-white mb-2 transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg",
                    getPlatformColor(pm.platform),
                    platformErrors[pm.platform] && "opacity-60"
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
                        {pm.totalReach > 0 
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
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
      
      const [facebookData, instagramData, threadsData, blueskyData, pinterestData, tiktokData, youtubeData] = await Promise.all([
        fetchWithCache('facebook', `/api/analytics/facebook?days=${days}`),
        fetchWithCache('instagram', `/api/analytics/instagram?days=${days}`),
        fetchWithCache('threads', `/api/analytics/threads?days=${days}`),
        fetchWithCache('bluesky', `/api/analytics/bluesky?days=${days}`),
        fetchWithCache('pinterest', `/api/analytics/pinterest?days=${days}`),
        fetchWithCache('tiktok', `/api/analytics/tiktok?days=${days}`),
        fetchWithCache('youtube', `/api/analytics/youtube?days=${days}`)
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

      // Process YouTube data
      if (youtubeData.metrics) {
        const metrics = metricsMap.get('youtube')!
        const m = youtubeData.metrics
        metrics.posts = m.totalPosts
        metrics.totalEngagement = m.totalEngagement
        metrics.totalReach = m.totalViews  // YouTube uses views as reach
        metrics.views = m.totalViews

        // Aggregate metrics from videos
        m.posts.forEach((video: any) => {
          metrics.likes += video.likes || 0
          metrics.comments += video.comments || 0
          // YouTube doesn't provide shares via API, but we track it as 0
          metrics.shares += video.shares || 0
        })
      } else if (youtubeData.error) {
        errors.youtube = 'Unable to load YouTube data'
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
                {[
                  {
                    name: 'instagram',
                    bgColor: 'linear-gradient(45deg, #833AB4, #F56040, #FCAF45)',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                      </svg>
                    )
                  },
                  {
                    name: 'facebook',
                    bgColor: '#1877F2',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    )
                  },
                  {
                    name: 'threads',
                    bgColor: '#000000',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/>
                      </svg>
                    )
                  },
                  {
                    name: 'youtube',
                    bgColor: '#FF0000',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    )
                  },
                  {
                    name: 'bluesky',
                    bgColor: '#00A8E8',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/>
                      </svg>
                    )
                  },
                  {
                    name: 'pinterest',
                    bgColor: '#E60023',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                      </svg>
                    )
                  },
                  {
                    name: 'tiktok',
                    bgColor: '#000000',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                      </svg>
                    )
                  }
                ].map((platform, index) => (
                  <div
                    key={platform.name}
                    data-platform={platform.name}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white animate-pulse"
                    style={{
                      animationDelay: `${index * 200}ms`,
                      background: platform.bgColor
                    }}
                  >
                    {platform.icon}
                  </div>
                ))}
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
                These numbers represent aggregated data from platforms with available analytics APIs. Currently, Facebook, Instagram, Threads, Pinterest, TikTok, YouTube, and Bluesky provide reach metrics, while other platforms are still developing their analytics capabilities.
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
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-9 gap-3 min-w-max md:min-w-0">
              {platformMetrics.sort((a, b) => {
                // Custom sort order: Instagram, Facebook, Threads, YouTube, Bluesky, Pinterest, TikTok, Twitter, LinkedIn
                const order = ['instagram', 'facebook', 'threads', 'youtube', 'bluesky', 'pinterest', 'tiktok', 'twitter', 'linkedin']
                const aIndex = order.indexOf(a.platform.toLowerCase())
                const bIndex = order.indexOf(b.platform.toLowerCase())

                // If both platforms are in the order array, sort by their position
                if (aIndex !== -1 && bIndex !== -1) {
                  return aIndex - bIndex
                }
                // If only one is in the order array, prioritize it
                if (aIndex !== -1) return -1
                if (bIndex !== -1) return 1
                // If neither is in the order array, sort alphabetically
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
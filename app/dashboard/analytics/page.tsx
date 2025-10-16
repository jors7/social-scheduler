'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OverviewCards } from '@/components/dashboard/analytics/overview-cards'
import { EngagementChart } from '@/components/dashboard/analytics/engagement-chart'
import { PlatformBreakdown } from '@/components/dashboard/analytics/platform-breakdown'
import { TopPosts } from '@/components/dashboard/analytics/top-posts'
import { ReachChart } from '@/components/dashboard/analytics/reach-chart'
import { PlatformInsightsTabs } from '@/components/dashboard/analytics/platform-insights-tabs'
import { CalendarDays, Download, Filter, BarChart3, RefreshCw, AlertCircle, Camera, AtSign, Facebook } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'

interface PlatformMetrics {
  platform: string
  totalPosts: number
  totalEngagement: number
  totalReach: number
  totalImpressions: number
  posts: any[]
}

interface AnalyticsData {
  totalPosts: number
  totalEngagement: number
  totalReach: number
  totalImpressions: number
  engagementRate: number
  topPlatform: string
  platformStats: Record<string, any>
  allPosts: any[]
  postedPosts: any[]
}

interface TrendComparison {
  current: number
  previous: number
  change: number
}

interface TrendData {
  totalPosts: TrendComparison
  totalEngagement: TrendComparison
  totalReach: TrendComparison
  totalImpressions: TrendComparison
  engagementRate: TrendComparison
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7') // Default to 7 days
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const dateRangeOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 3 months' },
  ]

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <Facebook className="h-5 w-5" />
      case 'instagram':
        return <Camera className="h-5 w-5" />
      case 'threads':
        return <AtSign className="h-5 w-5" />
      case 'bluesky':
        return <span className="text-lg">🦋</span>
      case 'pinterest':
        return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 4.3 2.7 7.9 6.4 9.3-.1-.8-.2-2 0-2.9.2-.8 1.3-5.4 1.3-5.4s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.6 2 1.7 2 2 0 3.5-2.1 3.5-5.2 0-2.7-2-4.6-4.8-4.6-3.3 0-5.2 2.5-5.2 5 0 1 .4 2.1.9 2.7.1.1.1.2.1.3-.1.4-.3 1.1-.3 1.3-.1.2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.4 0-3.6 2.6-6.9 7.5-6.9 3.9 0 7 2.8 7 6.6 0 3.9-2.5 7.1-5.9 7.1-1.2 0-2.3-.6-2.6-1.3l-.7 2.8c-.3 1-1 2.3-1.5 3.1 1.1.3 2.3.5 3.5.5 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
        </svg>
      case 'tiktok':
        return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 12 3v8.5a4.5 4.5 0 1 1-3-4.24v3.1a1.5 1.5 0 1 0 0 2.14V3h3a6.5 6.5 0 0 0 6.5 6.5V6.5A3.5 3.5 0 0 0 19 3z"/>
        </svg>
      default:
        return <BarChart3 className="h-5 w-5" />
    }
  }

  const fetchRealAnalytics = async () => {
    try {
      // Only show full loading screen on initial load
      if (!analyticsData) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      // Fetch data from all platforms in parallel (including trends)
      // Add cache-busting timestamp to ensure fresh data
      const cacheBust = Date.now();
      const [facebookRes, instagramRes, threadsRes, blueskyRes, pinterestRes, tiktokRes, trendsRes] = await Promise.all([
        fetch(`/api/analytics/facebook?days=${dateRange}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/instagram?days=${dateRange}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/threads?days=${dateRange}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/bluesky?days=${dateRange}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/pinterest?days=${dateRange}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/tiktok?days=${dateRange}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/trends?days=${dateRange}&_=${cacheBust}`, { cache: 'no-store' })
      ])

      const [facebookData, instagramData, threadsData, blueskyData, pinterestData, tiktokData, trendsDataRes] = await Promise.all([
        facebookRes.ok ? facebookRes.json() : { metrics: null },
        instagramRes.ok ? instagramRes.json() : { metrics: null },
        threadsRes.ok ? threadsRes.json() : { metrics: null },
        blueskyRes.ok ? blueskyRes.json() : { metrics: null },
        pinterestRes.ok ? pinterestRes.json() : { metrics: null },
        tiktokRes.ok ? tiktokRes.json() : { metrics: null },
        trendsRes.ok ? trendsRes.json() : { trends: null }
      ])

      // Aggregate all metrics
      let totalPosts = 0
      let totalEngagement = 0
      let totalReach = 0
      let totalImpressions = 0
      const platformStats: Record<string, any> = {}
      const allPosts: any[] = []

      // Process Facebook data
      if (facebookData.metrics) {
        const metrics = facebookData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalReach
        totalImpressions += metrics.totalImpressions
        
        platformStats.facebook = {
          posts: metrics.totalPosts,
          engagement: metrics.totalEngagement,
          reach: metrics.totalReach,
          impressions: metrics.totalImpressions
        }
        
        // Add posts with platform tag
        metrics.posts.forEach((post: any) => {
          allPosts.push({ ...post, platform: 'facebook' })
        })
      }

      // Process Instagram data
      console.log('[Frontend] Instagram API response:', instagramData)
      if (instagramData.metrics) {
        const metrics = instagramData.metrics
        console.log('[Frontend] Instagram metrics:', metrics)
        console.log('[Frontend] Instagram totalPosts:', metrics.totalPosts)
        console.log('[Frontend] Instagram totalEngagement:', metrics.totalEngagement)
        console.log('[Frontend] Instagram totalReach:', metrics.totalReach)
        console.log('[Frontend] Instagram totalImpressions:', metrics.totalImpressions)
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalReach
        totalImpressions += metrics.totalImpressions || 0 // Use plays (views) as impressions

        platformStats.instagram = {
          posts: metrics.totalPosts,
          engagement: metrics.totalEngagement,
          reach: metrics.totalReach,
          impressions: metrics.totalImpressions || 0 // Use plays (views) from API
        }
        console.log('[Frontend] platformStats.instagram:', platformStats.instagram)

        // Add posts with platform tag
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'instagram',
            impressions: post.impressions || post.plays || 0 // Use plays (views) as impressions
          })
        })
      }

      // Process Threads data
      if (threadsData.metrics) {
        const metrics = threadsData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalViews
        totalImpressions += metrics.totalViews
        
        platformStats.threads = {
          posts: metrics.totalPosts,
          engagement: metrics.totalEngagement,
          reach: metrics.totalViews,
          impressions: metrics.totalViews
        }
        
        // Add posts with platform tag
        metrics.posts.forEach((post: any) => {
          allPosts.push({ 
            ...post, 
            platform: 'threads',
            // Normalize fields for consistency
            impressions: post.views,
            reach: post.views
          })
        })
      }

      // Process Bluesky data
      if (blueskyData.metrics) {
        const metrics = blueskyData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalReach

        platformStats.bluesky = {
          posts: metrics.totalPosts,
          engagement: metrics.totalEngagement,
          reach: metrics.totalReach,
          impressions: metrics.totalReach
        }

        // Add posts with platform tag
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'bluesky',
            // Bluesky doesn't have real reach/impressions
            impressions: 0,
            reach: 0
          })
        })
      }

      // Process Pinterest data
      if (pinterestData.metrics) {
        const metrics = pinterestData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalReach
        totalImpressions += metrics.totalImpressions

        platformStats.pinterest = {
          posts: metrics.totalPosts,
          engagement: metrics.totalEngagement,
          reach: metrics.totalReach,
          impressions: metrics.totalImpressions
        }

        // Add posts with platform tag
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'pinterest',
            // Normalize fields for consistency
            likes: post.saves || 0,
            comments: post.pin_clicks || 0,
            shares: post.outbound_clicks || 0,
            impressions: post.impressions || 0,
            reach: post.impressions || 0
          })
        })
      }

      // Process TikTok data
      if (tiktokData.metrics) {
        const metrics = tiktokData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalViews
        totalImpressions += metrics.totalViews

        platformStats.tiktok = {
          posts: metrics.totalPosts,
          engagement: metrics.totalEngagement,
          reach: metrics.totalViews,
          impressions: metrics.totalViews
        }

        // Add posts with platform tag
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'tiktok',
            // Normalize fields for consistency
            created_time: post.created_time,
            timestamp: post.created_time,
            message: post.title || post.description,
            impressions: post.views || 0,
            reach: post.views || 0
          })
        })
      }

      // Find top platform by engagement
      let topPlatform = 'N/A'
      let maxEngagement = 0
      Object.entries(platformStats).forEach(([platform, stats]) => {
        if (stats.engagement > maxEngagement) {
          maxEngagement = stats.engagement
          topPlatform = platform.charAt(0).toUpperCase() + platform.slice(1)
        }
      })

      const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0

      setAnalyticsData({
        totalPosts,
        totalEngagement,
        totalReach,
        totalImpressions,
        engagementRate,
        topPlatform,
        platformStats,
        allPosts,
        postedPosts: allPosts // Use allPosts for postedPosts as well
      })

      // Set trend data if available
      if (trendsDataRes && trendsDataRes.trends) {
        setTrendData(trendsDataRes.trends)
      }

    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchRealAnalytics()
  }
  
  const generateCSV = (data: AnalyticsData, days: string) => {
    const lines: string[] = []
    
    // Header
    lines.push('Analytics Report - Last ' + days + ' days')
    lines.push('Generated on,' + new Date().toLocaleDateString())
    lines.push('')
    
    // Overview Metrics
    lines.push('Overview Metrics')
    lines.push('Metric,Value')
    lines.push('Total Posts,' + data.totalPosts)
    lines.push('Total Engagement,' + data.totalEngagement)
    lines.push('Total Reach,' + data.totalReach)
    lines.push('Total Impressions,' + data.totalImpressions)
    lines.push('Engagement Rate,' + data.engagementRate.toFixed(2) + '%')
    lines.push('Top Platform,' + data.topPlatform)
    lines.push('')
    
    // Platform Breakdown
    lines.push('Platform Breakdown')
    lines.push('Platform,Posts,Engagement,Reach,Impressions')
    Object.entries(data.platformStats).forEach(([platform, stats]: [string, any]) => {
      lines.push(`${platform},${stats.posts || 0},${stats.engagement || 0},${stats.reach || 0},${stats.impressions || 0}`)
    })
    lines.push('')
    
    // Top Posts
    lines.push('Top Performing Posts')
    lines.push('Platform,Content,Date,Likes,Comments,Shares/Reposts,Views/Reach,Total Engagement')
    
    // Sort and get top 10 posts
    const topPosts = data.allPosts
      .map(post => {
        // Calculate total engagement based on platform
        let engagement = 0
        if (post.platform === 'facebook') {
          engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
        } else if (post.platform === 'instagram') {
          engagement = (post.likes || 0) + (post.comments || 0) + (post.saves || 0)
        } else if (post.platform === 'threads') {
          engagement = (post.likes || 0) + (post.replies || 0) + (post.reposts || 0) + (post.quotes || 0)
        } else if (post.platform === 'bluesky') {
          engagement = (post.likes || 0) + (post.replies || 0) + (post.reposts || 0)
        } else if (post.platform === 'pinterest') {
          engagement = (post.saves || 0) + (post.pin_clicks || 0) + (post.outbound_clicks || 0)
        } else if (post.platform === 'tiktok') {
          engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
        }
        return { ...post, totalEngagement: engagement }
      })
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 10)
    
    topPosts.forEach(post => {
      // Clean content for CSV (remove commas and limit length)
      const content = (post.message || post.text || post.caption || post.title || post.description || '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/,/g, ';')
        .substring(0, 100)

      const date = new Date(post.created_time || post.timestamp || post.createdAt || post.created_at).toLocaleDateString()
      const shares = post.shares || post.reposts || post.outbound_clicks || 0
      const views = post.views || post.reach || post.impressions || 0

      lines.push(`${post.platform},${content},${date},${post.likes || post.saves || 0},${post.comments || post.replies || post.pin_clicks || 0},${shares},${views},${post.totalEngagement}`)
    })
    
    return lines.join('\n')
  }
  
  const handleExport = () => {
    if (!analyticsData) {
      toast.error('No data to export')
      return
    }
    
    try {
      // Generate CSV content
      const csvContent = generateCSV(analyticsData, dateRange)
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `analytics_${dateRange}days_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Analytics exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export analytics')
    }
  }

  useEffect(() => {
    fetchRealAnalytics()
  }, [dateRange])

  if (loading && !analyticsData) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              Analytics
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-lg">
              Real-time performance data from your social media accounts
            </p>
          </div>
        </div>
        
        {/* Beautiful Loading Animation */}
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
                <p className="text-sm text-gray-500">
                  Fetching complete data from all your posts...
                </p>
              </div>
              
              {/* Platform Icons */}
              <div className="flex space-x-3">
                {[
                  { name: 'facebook', bgColor: '#3b82f6' },
                  { name: 'instagram', bgColor: '#a855f7' },
                  { name: 'threads', bgColor: '#374151' },
                  { name: 'bluesky', bgColor: '#0ea5e9' },
                  { name: 'pinterest', bgColor: '#ef4444' },
                  { name: 'tiktok', bgColor: '#000000' }
                ].map((platform, index) => (
                  <div
                    key={platform.name}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white animate-pulse"
                    style={{
                      animationDelay: `${index * 200}ms`,
                      backgroundColor: platform.bgColor
                    }}
                  >
                    {getPlatformIcon(platform.name)}
                  </div>
                ))}
              </div>
              
              {/* Progress Bar */}
              <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" 
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            Analytics
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-lg">
            Real-time performance data from your social media accounts
          </p>
        </div>
      </div>
      
      <SubscriptionGate feature="analytics">
        <div className="space-y-8">
          <Card variant="glass" className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                    <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                  </div>
                  <select 
                    className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    {dateRangeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {refreshing && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Loading analytics data...</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-xs sm:text-sm px-3 sm:px-4"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  className="text-xs sm:text-sm px-3 sm:px-4"
                  onClick={handleExport}
                  disabled={!analyticsData || loading || refreshing}
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </Card>

          {/* Platform Coverage Info */}
          <Card variant="elevated" className="p-3 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Platform Coverage</p>
                <p className="mt-0.5">Analytics are currently available for Facebook, Instagram, Threads, Bluesky, Pinterest, and TikTok. Longer date ranges may take more time to load as we fetch complete data from all your posts.</p>
              </div>
            </div>
          </Card>
          
          {/* Overview Cards */}
          <OverviewCards analyticsData={analyticsData} trendData={trendData} dateRange={dateRange} />

          <div className="grid gap-4 sm:gap-8 grid-cols-1 md:grid-cols-2">
            {/* Engagement Chart */}
            <Card variant="elevated" className="col-span-1 overflow-hidden">
              <CardHeader variant="gradient" className="px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle className="text-white text-base sm:text-xl">Engagement Over Time</CardTitle>
                <CardDescription className="text-purple-100 text-xs sm:text-sm">
                  Track likes, comments, and shares across all platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-gradient-to-b from-white to-gray-50 p-3 sm:p-6">
                <EngagementChart analyticsData={analyticsData} />
              </CardContent>
            </Card>

            {/* Platform Breakdown */}
            <Card variant="elevated" className="col-span-1 overflow-hidden">
              <CardHeader variant="gradient" className="px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle className="text-white text-base sm:text-xl">Platform Performance</CardTitle>
                <CardDescription className="text-purple-100 text-xs sm:text-sm">
                  Compare engagement rates by platform
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-gradient-to-b from-white to-gray-50 p-3 sm:p-6">
                <PlatformBreakdown analyticsData={analyticsData} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:gap-8 grid-cols-1 md:grid-cols-3 items-stretch">
            {/* Reach Chart */}
            <Card variant="glass" className="col-span-1 md:col-span-2 overflow-hidden flex flex-col h-full">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle variant="gradient" className="text-base sm:text-xl">Reach & Impressions</CardTitle>
                <CardDescription className="text-gray-600 text-xs sm:text-sm">
                  Monitor your content reach and impressions
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-white/50 backdrop-blur-sm p-3 sm:p-4 pb-4 flex-1 flex flex-col">
                <ReachChart analyticsData={analyticsData} dateRange={dateRange} />
              </CardContent>
            </Card>

            {/* Top Posts */}
            <Card variant="glass" className="col-span-1 overflow-hidden flex flex-col h-full">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle variant="gradient" className="text-base sm:text-xl">Top Performing Posts</CardTitle>
                <CardDescription className="text-gray-600 text-xs sm:text-sm">
                  Your best content from the selected period
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-white/50 backdrop-blur-sm p-3 sm:p-6 flex-1 flex flex-col">
                <TopPosts analyticsData={analyticsData} />
              </CardContent>
            </Card>
          </div>

          {/* Platform Insights with Tabs */}
          <PlatformInsightsTabs className="mt-8" />
        </div>
      </SubscriptionGate>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OverviewCards } from '@/components/dashboard/analytics/overview-cards'
import { EngagementChart } from '@/components/dashboard/analytics/engagement-chart'
import { PlatformBreakdown } from '@/components/dashboard/analytics/platform-breakdown'
import { TopPosts } from '@/components/dashboard/analytics/top-posts'
import { ReachChart } from '@/components/dashboard/analytics/reach-chart'
import { CalendarDays, Download, Filter, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'

interface AnalyticsData {
  totalPosts: number
  totalEngagement: number
  totalReach: number
  totalImpressions: number
  engagementRate: number
  topPlatform: string
  postedPosts: any[]
  platformStats: Record<string, any>
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ]

  const fetchAnalyticsData = async () => {
    try {
      // Fetch all posts data including YouTube uploads
      const [draftsResponse, scheduledResponse, youtubeResponse] = await Promise.all([
        fetch('/api/drafts'),
        fetch('/api/posts/schedule'),
        fetch('/api/youtube/uploads')
      ])
      
      if (!draftsResponse.ok || !scheduledResponse.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const [draftsData, scheduledData, youtubeData] = await Promise.all([
        draftsResponse.json(),
        scheduledResponse.json(),
        youtubeResponse.ok ? youtubeResponse.json() : { uploads: [] }
      ])
      
      const drafts = draftsData.drafts || []
      const scheduled = scheduledData.posts || []
      const youtubeUploads = youtubeData.uploads || []
      
      // Include YouTube uploads in the total posts count
      const allPosts = [...drafts, ...scheduled]
      const postedPosts = scheduled.filter((post: any) => post.status === 'posted')
      
      // Add YouTube uploads to posted posts count
      const totalYouTubePosts = youtubeUploads.length
      
      // Calculate analytics
      let totalEngagement = 0
      let totalReach = 0
      let totalImpressions = 0
      const platformStats: Record<string, any> = {}
      
      // Process regular posted posts
      postedPosts.forEach((post: any) => {
        if (post.post_results && Array.isArray(post.post_results)) {
          post.post_results.forEach((result: any) => {
            if (result.success && result.data) {
              const platform = result.platform
              if (!platformStats[platform]) {
                platformStats[platform] = {
                  posts: 0,
                  engagement: 0,
                  reach: 0,
                  impressions: 0
                }
              }
              
              platformStats[platform].posts++
              
              if (result.data.metrics) {
                const metrics = result.data.metrics
                const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0)
                const reach = metrics.views || metrics.impressions || 0
                
                totalEngagement += engagement
                totalReach += reach
                totalImpressions += reach // For now, treating views as impressions
                
                platformStats[platform].engagement += engagement
                platformStats[platform].reach += reach
                platformStats[platform].impressions += reach
              }
            }
          })
        }
      })
      
      // Add YouTube uploads to platform stats
      if (totalYouTubePosts > 0) {
        if (!platformStats['youtube']) {
          platformStats['youtube'] = {
            posts: 0,
            engagement: 0,
            reach: 0,
            impressions: 0
          }
        }
        platformStats['youtube'].posts += totalYouTubePosts
        
        // For YouTube, we don't have engagement metrics yet, but we count the posts
        // In a production app, you'd fetch these metrics from YouTube Analytics API
      }
      
      // Find top platform
      let topPlatform = 'N/A'
      let maxEngagement = 0
      Object.entries(platformStats).forEach(([platform, stats]) => {
        if (stats.engagement > maxEngagement) {
          maxEngagement = stats.engagement
          topPlatform = platform.charAt(0).toUpperCase() + platform.slice(1)
        }
      })
      
      const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0
      
      // Calculate total posted posts including YouTube
      const totalPostedPosts = postedPosts.length + totalYouTubePosts
      
      setAnalyticsData({
        totalPosts: totalPostedPosts,  // Show total posted posts (including YouTube)
        totalEngagement,
        totalReach,
        totalImpressions,
        engagementRate,
        topPlatform,
        postedPosts: [...postedPosts, ...youtubeUploads.map((upload: any) => ({
          ...upload,
          platforms: ['youtube'],
          status: 'posted',
          post_results: [{
            platform: 'youtube',
            success: true,
            postId: upload.video_id,
            url: upload.url,
            data: { title: upload.title, url: upload.url }
          }]
        }))],
        platformStats
      })
      
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  if (loading) {
    return (
      <>
        <div className="space-y-4 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                Analytics
              </h1>
              <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-lg">
                Track your social media performance across all platforms
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} variant="elevated" className="animate-pulse">
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4">
                  <div className="h-3 sm:h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 sm:w-24"></div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4">
                  <div className="h-6 sm:h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-12 sm:w-16 mb-1 sm:mb-2"></div>
                  <div className="h-2 sm:h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 sm:w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
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
            Track your social media performance across all platforms
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
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button variant="outline" size="sm" className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-xs sm:text-sm px-3 sm:px-4">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  <span className="sm:hidden">Filter</span>
                </Button>
                <Button variant="gradient" size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </Card>

          {/* Overview Cards */}
          <OverviewCards analyticsData={analyticsData} />

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

          <div className="grid gap-4 sm:gap-8 grid-cols-1 md:grid-cols-3 items-start">
            {/* Reach Chart */}
            <Card variant="glass" className="col-span-1 md:col-span-2 overflow-hidden h-fit">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle variant="gradient" className="text-base sm:text-xl">Reach & Impressions</CardTitle>
                <CardDescription className="text-gray-600 text-xs sm:text-sm">
                  Monitor your content reach and impressions
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-white/50 backdrop-blur-sm p-3 sm:p-4 pb-4">
                <ReachChart analyticsData={analyticsData} />
              </CardContent>
            </Card>

            {/* Top Posts */}
            <Card variant="glass" className="col-span-1 overflow-hidden h-fit">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle variant="gradient" className="text-base sm:text-xl">Top Performing Posts</CardTitle>
                <CardDescription className="text-gray-600 text-xs sm:text-sm">
                  Your best content from the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-white/50 backdrop-blur-sm p-3 sm:p-6">
                <TopPosts analyticsData={analyticsData} />
              </CardContent>
            </Card>
          </div>
        </div>
      </SubscriptionGate>
    </div>
  )
}
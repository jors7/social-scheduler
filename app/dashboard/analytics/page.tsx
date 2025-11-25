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
import { CalendarDays, Download, Filter, BarChart3, RefreshCw, AlertCircle, Camera, AtSign, Facebook, Youtube } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'
import { PreviewDataBanner } from '@/components/dashboard/analytics/preview-data-banner'

// Generate mock posts with realistic data spread over the last 7 days
const generateMockPosts = () => {
  const posts = []
  const now = new Date()

  // Facebook posts (4 posts)
  for (let i = 0; i < 4; i++) {
    const daysAgo = Math.floor(i * 1.75) // Spread over 7 days
    const postDate = new Date(now)
    postDate.setDate(postDate.getDate() - daysAgo)

    posts.push({
      platform: 'facebook',
      id: `fb_${i}`,
      created_time: postDate.toISOString(),
      message: 'Sample Facebook post content',
      likes: Math.floor(Math.random() * 200) + 50,
      comments: Math.floor(Math.random() * 30) + 5,
      shares: Math.floor(Math.random() * 20) + 2,
      reach: Math.floor(Math.random() * 4000) + 2000,
      impressions: Math.floor(Math.random() * 5000) + 2500
    })
  }

  // Instagram posts (6 posts)
  for (let i = 0; i < 6; i++) {
    const daysAgo = Math.floor(i * 1.16) // Spread over 7 days
    const postDate = new Date(now)
    postDate.setDate(postDate.getDate() - daysAgo)

    posts.push({
      platform: 'instagram',
      id: `ig_${i}`,
      timestamp: postDate.toISOString(),
      caption: 'Sample Instagram post content',
      likes: Math.floor(Math.random() * 300) + 100,
      comments: Math.floor(Math.random() * 40) + 10,
      saves: Math.floor(Math.random() * 50) + 10,
      reach: Math.floor(Math.random() * 5000) + 3000,
      impressions: Math.floor(Math.random() * 6000) + 3500
    })
  }

  // Threads posts (3 posts)
  for (let i = 0; i < 3; i++) {
    const daysAgo = Math.floor(i * 2.3) // Spread over 7 days
    const postDate = new Date(now)
    postDate.setDate(postDate.getDate() - daysAgo)

    posts.push({
      platform: 'threads',
      id: `threads_${i}`,
      timestamp: postDate.toISOString(),
      text: 'Sample Threads post content',
      likes: Math.floor(Math.random() * 150) + 40,
      replies: Math.floor(Math.random() * 20) + 5,
      reposts: Math.floor(Math.random() * 15) + 3,
      quotes: Math.floor(Math.random() * 10) + 2,
      views: Math.floor(Math.random() * 3500) + 2000
    })
  }

  // YouTube posts (2 posts)
  for (let i = 0; i < 2; i++) {
    const daysAgo = Math.floor(i * 3.5) // Spread over 7 days
    const postDate = new Date(now)
    postDate.setDate(postDate.getDate() - daysAgo)

    posts.push({
      platform: 'youtube',
      id: `yt_${i}`,
      created_time: postDate.toISOString(),
      title: 'Sample YouTube video',
      likes: Math.floor(Math.random() * 250) + 80,
      comments: Math.floor(Math.random() * 35) + 10,
      shares: Math.floor(Math.random() * 25) + 5,
      views: Math.floor(Math.random() * 4000) + 2500
    })
  }

  return posts
}

// Mock data for preview when no accounts are connected
const MOCK_ANALYTICS_DATA: AnalyticsData = {
  totalPosts: 15,
  totalEngagement: 2847,
  totalReach: 54320,
  totalImpressions: 68500,
  engagementRate: 5.2,
  topPlatform: 'Instagram',
  platformStats: {
    facebook: { posts: 4, engagement: 680, reach: 12500, impressions: 14500 },
    instagram: { posts: 6, engagement: 1240, reach: 25800, impressions: 31000 },
    threads: { posts: 3, engagement: 520, reach: 8900, impressions: 8900 },
    youtube: { posts: 2, engagement: 407, reach: 7120, impressions: 14100 }
  },
  allPosts: generateMockPosts(),
  currentPeriodPosts: generateMockPosts(),
  postedPosts: generateMockPosts()
}

const MOCK_TREND_DATA: TrendData = {
  totalPosts: { current: 15, previous: 12, change: 25.0 },
  totalEngagement: { current: 2847, previous: 2450, change: 16.2 },
  totalReach: { current: 54320, previous: 47100, change: 15.3 },
  totalImpressions: { current: 68500, previous: 59200, change: 15.7 },
  engagementRate: { current: 5.2, previous: 4.8, change: 8.3 }
}

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
  currentPeriodPosts: any[] // Filtered posts for selected date range
  postedPosts: any[]
}

interface TrendComparison {
  current: number
  previous: number
  change: number | null
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
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(true) // Track if user has connected accounts

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
      case 'youtube':
        return <Youtube className="h-5 w-5" />
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

      // Fetch data from all platforms in parallel
      // Add cache-busting timestamp to ensure fresh data
      // Fetch double the date range to enable period-over-period comparison
      const cacheBust = Date.now();
      const fetchDays = parseInt(dateRange) * 2; // Fetch current + previous period
      const [facebookRes, instagramRes, threadsRes, blueskyRes, pinterestRes, tiktokRes, youtubeRes] = await Promise.all([
        fetch(`/api/analytics/facebook?days=${fetchDays}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/instagram?days=${fetchDays}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/threads?days=${fetchDays}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/bluesky?days=${fetchDays}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/pinterest?days=${fetchDays}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/tiktok?days=${fetchDays}&_=${cacheBust}`, { cache: 'no-store' }),
        fetch(`/api/analytics/youtube?days=${fetchDays}&_=${cacheBust}`, { cache: 'no-store' })
      ])

      const [facebookData, instagramData, threadsData, blueskyData, pinterestData, tiktokData, youtubeData] = await Promise.all([
        facebookRes.ok ? facebookRes.json() : { metrics: null },
        instagramRes.ok ? instagramRes.json() : { metrics: null },
        threadsRes.ok ? threadsRes.json() : { metrics: null },
        blueskyRes.ok ? blueskyRes.json() : { metrics: null },
        pinterestRes.ok ? pinterestRes.json() : { metrics: null },
        tiktokRes.ok ? tiktokRes.json() : { metrics: null },
        youtubeRes.ok ? youtubeRes.json() : { metrics: null }
      ])

      // Aggregate all metrics first to determine if there's real data
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
        totalImpressions += metrics.totalImpressions // Now includes video views + page impressions

        platformStats.facebook = {
          posts: metrics.totalPosts,
          engagement: metrics.totalEngagement,
          reach: metrics.totalReach,
          impressions: metrics.totalImpressions, // This is now views (video views + page impressions)
          views: metrics.totalImpressions // Track as views for clarity
        }

        // Add posts with platform tag and flatten metrics
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'facebook',
            // Flatten metrics to root level for consistency (check both nested metrics and direct fields)
            reach: post.metrics?.reach ?? post.reach ?? null,
            impressions: post.metrics?.impressions ?? post.impressions ?? post.views ?? null,
            views: post.metrics?.views ?? post.views ?? post.impressions ?? null,
            engagement: post.metrics?.engagement ?? post.totalEngagement ?? post.engagement ?? 0,
            likes: post.metrics?.likes ?? post.likes ?? 0,
            comments: post.metrics?.comments ?? post.comments ?? 0,
            shares: post.metrics?.shares ?? post.shares ?? 0,
            reactions: post.metrics?.reactions ?? post.reactions ?? 0
          })
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

        // Add posts with platform tag and flatten metrics
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'instagram',
            // Flatten metrics to root level (check nested metrics, direct fields, and Instagram-specific names)
            likes: post.metrics?.likes ?? post.likes ?? post.like_count ?? 0,
            comments: post.metrics?.comments ?? post.comments ?? post.comments_count ?? 0,
            saves: post.metrics?.saves ?? post.saves ?? 0,
            reach: post.metrics?.reach ?? post.reach ?? 0,
            impressions: post.metrics?.impressions ?? post.impressions ?? post.plays ?? 0,
            total_interactions: post.metrics?.total_interactions ?? post.total_interactions ?? 0
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
        
        // Add posts with platform tag and flatten metrics
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'threads',
            // Flatten metrics to root level
            likes: post.metrics?.likes ?? post.likes ?? 0,
            comments: post.metrics?.replies ?? post.replies ?? post.comments ?? 0,
            shares: post.metrics?.reposts ?? post.reposts ?? post.shares ?? 0,
            quotes: post.metrics?.quotes ?? post.quotes ?? 0,
            impressions: post.metrics?.views ?? post.views ?? 0,
            reach: post.metrics?.views ?? post.views ?? 0
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

        // Add posts with platform tag and flatten metrics
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'bluesky',
            // Flatten metrics to root level
            likes: post.metrics?.likes ?? post.likes ?? post.likeCount ?? 0,
            comments: post.metrics?.replies ?? post.replies ?? post.replyCount ?? 0,
            shares: post.metrics?.reposts ?? post.reposts ?? post.repostCount ?? 0,
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

        // Add posts with platform tag and flatten metrics
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'pinterest',
            // Flatten metrics to root level (Pinterest has unique metrics)
            likes: post.metrics?.saves ?? post.saves ?? 0,
            comments: post.metrics?.pin_clicks ?? post.pin_clicks ?? 0,
            shares: post.metrics?.outbound_clicks ?? post.outbound_clicks ?? 0,
            impressions: post.metrics?.impressions ?? post.impressions ?? 0,
            reach: post.metrics?.impressions ?? post.impressions ?? 0
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

        // Add posts with platform tag and flatten metrics
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'tiktok',
            // Flatten metrics to root level
            created_time: post.created_time,
            timestamp: post.created_time,
            message: post.title || post.description,
            likes: post.metrics?.likes ?? post.likes ?? 0,
            comments: post.metrics?.comments ?? post.comments ?? 0,
            shares: post.metrics?.shares ?? post.shares ?? 0,
            views: post.metrics?.views ?? post.views ?? 0,
            impressions: post.metrics?.views ?? post.views ?? 0,
            reach: post.metrics?.views ?? post.views ?? 0
          })
        })
      }

      // Process YouTube data
      if (youtubeData.metrics) {
        const metrics = youtubeData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalViews
        totalImpressions += metrics.totalViews

        platformStats.youtube = {
          posts: metrics.totalPosts,
          engagement: metrics.totalEngagement,
          reach: metrics.totalViews,
          impressions: metrics.totalViews
        }

        // Add posts with platform tag and flatten metrics
        metrics.posts.forEach((post: any) => {
          allPosts.push({
            ...post,
            platform: 'youtube',
            // Flatten metrics to root level
            created_time: post.created_time,
            timestamp: post.created_time,
            message: post.title,
            likes: post.metrics?.likes ?? post.likes ?? 0,
            comments: post.metrics?.comments ?? post.comments ?? 0,
            shares: post.metrics?.shares ?? post.shares ?? 0,
            views: post.metrics?.views ?? post.views ?? 0,
            impressions: post.metrics?.views ?? post.views ?? 0,
            reach: post.metrics?.views ?? post.views ?? 0
          })
        })
      }

      // Check if user has any posts at all (before date filtering)
      // If no posts exist across all platforms, show mock data with banner
      if (allPosts.length === 0) {
        console.log('[Analytics] No posts found across all platforms - showing mock data')
        setHasConnectedAccounts(false)
        setAnalyticsData(MOCK_ANALYTICS_DATA)
        setTrendData(MOCK_TREND_DATA)
        setLoading(false)
        setRefreshing(false)
        return
      }

      // User has posts - show real data (even if current period might be empty)
      setHasConnectedAccounts(true)
      console.log('[Analytics] Found posts - showing real data')

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

      // Recalculate totals for CURRENT period only (not the entire fetched range)
      // This is needed because we fetch double the period for comparisons
      const currentPeriodStart = new Date();
      currentPeriodStart.setDate(currentPeriodStart.getDate() - parseInt(dateRange));
      currentPeriodStart.setHours(0, 0, 0, 0);

      const currentPeriodPosts = allPosts.filter(post => {
        const postDate = new Date(post.created_time || post.timestamp || post.createdAt || post.created_at);
        return postDate >= currentPeriodStart && postDate <= new Date();
      });

      // Recalculate metrics for current period only
      // Use API-provided totals from platformStats instead of recalculating from individual posts
      // This preserves accurate Facebook metrics where post-level reach is incomplete due to Instagram cross-post API restrictions
      const currentTotalPosts = Object.values(platformStats).reduce((sum, stats) => sum + (stats.posts || 0), 0);
      const currentTotalEngagement = Object.values(platformStats).reduce((sum, stats) => sum + (stats.engagement || 0), 0);
      const currentTotalReach = Object.values(platformStats).reduce((sum, stats) => sum + (stats.reach || 0), 0);
      const currentTotalImpressions = Object.values(platformStats).reduce((sum, stats) => sum + (stats.impressions || 0), 0);

      const currentEngagementRate = currentTotalReach > 0 ? (currentTotalEngagement / currentTotalReach) * 100 : 0;

      // Set analytics data with current period metrics
      setAnalyticsData({
        totalPosts: currentTotalPosts,
        totalEngagement: currentTotalEngagement,
        totalReach: currentTotalReach,
        totalImpressions: currentTotalImpressions,
        engagementRate: currentEngagementRate,
        topPlatform,
        platformStats,
        allPosts,
        currentPeriodPosts, // Filtered posts for selected date range
        postedPosts: allPosts // Use allPosts for postedPosts as well
      })

      // Calculate trends from the fetched posts data
      const calculateTrendsFromPosts = () => {
        const currentPeriodStart = new Date();
        currentPeriodStart.setDate(currentPeriodStart.getDate() - parseInt(dateRange));
        currentPeriodStart.setHours(0, 0, 0, 0);

        const previousPeriodEnd = new Date(currentPeriodStart);
        previousPeriodEnd.setMilliseconds(previousPeriodEnd.getMilliseconds() - 1);

        const previousPeriodStart = new Date(previousPeriodEnd);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(dateRange) + 1);
        previousPeriodStart.setHours(0, 0, 0, 0);

        // Filter posts by period
        const currentPosts = allPosts.filter(post => {
          const postDate = new Date(post.created_time || post.timestamp || post.createdAt || post.created_at);
          return postDate >= currentPeriodStart && postDate <= new Date();
        });

        const previousPosts = allPosts.filter(post => {
          const postDate = new Date(post.created_time || post.timestamp || post.createdAt || post.created_at);
          return postDate >= previousPeriodStart && postDate <= previousPeriodEnd;
        });

        // Calculate metrics for each period
        const calculateMetrics = (posts: any[]) => {
          let engagement = 0, reach = 0, impressions = 0;

          posts.forEach(post => {
            if (post.platform === 'facebook') {
              // Use pre-calculated engagement from API (includes likes + comments + shares + reactions)
              engagement += post.engagement || post.totalEngagement || 0;
              reach += post.reach || 0;
              impressions += post.impressions || 0;
            } else if (post.platform === 'instagram') {
              engagement += (post.likes || 0) + (post.comments || 0) + (post.saves || 0);
              reach += post.reach || 0;
              impressions += post.impressions || post.plays || 0;
            } else if (post.platform === 'threads') {
              engagement += (post.likes || 0) + (post.replies || 0) + (post.reposts || 0) + (post.quotes || 0);
              reach += post.views || 0;
              impressions += post.views || 0;
            } else if (post.platform === 'bluesky') {
              engagement += (post.likes || 0) + (post.replies || 0) + (post.reposts || 0);
            } else if (post.platform === 'pinterest') {
              engagement += (post.saves || 0) + (post.pin_clicks || 0) + (post.outbound_clicks || 0);
              reach += post.impressions || 0;
              impressions += post.impressions || 0;
            } else if (post.platform === 'tiktok') {
              engagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
              reach += post.views || 0;
              impressions += post.views || 0;
            } else if (post.platform === 'youtube') {
              engagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
              reach += post.views || 0;
              impressions += post.views || 0;
            }
          });

          return { posts: posts.length, engagement, reach, impressions };
        };

        const currentMetrics = calculateMetrics(currentPosts);
        const previousMetrics = calculateMetrics(previousPosts);

        const calculateChange = (current: number, previous: number): number | null => {
          // If both are zero, no change
          if (previous === 0 && current === 0) return 0;
          // If previous is zero but current is not, return null (no valid comparison)
          if (previous === 0) return null;
          return ((current - previous) / previous) * 100;
        };

        const currentEngagementRate = currentMetrics.impressions > 0
          ? (currentMetrics.engagement / currentMetrics.impressions) * 100
          : 0;
        const previousEngagementRate = previousMetrics.impressions > 0
          ? (previousMetrics.engagement / previousMetrics.impressions) * 100
          : 0;

        // Only show trends if we have data in BOTH periods for meaningful comparison
        if (currentMetrics.posts > 0 && previousMetrics.posts > 0) {
          setTrendData({
            totalPosts: {
              current: currentMetrics.posts,
              previous: previousMetrics.posts,
              change: calculateChange(currentMetrics.posts, previousMetrics.posts)
            },
            totalEngagement: {
              current: currentMetrics.engagement,
              previous: previousMetrics.engagement,
              change: calculateChange(currentMetrics.engagement, previousMetrics.engagement)
            },
            totalReach: {
              current: currentMetrics.reach,
              previous: previousMetrics.reach,
              change: calculateChange(currentMetrics.reach, previousMetrics.reach)
            },
            totalImpressions: {
              current: currentMetrics.impressions,
              previous: previousMetrics.impressions,
              change: calculateChange(currentMetrics.impressions, previousMetrics.impressions)
            },
            engagementRate: {
              current: currentEngagementRate,
              previous: previousEngagementRate,
              change: calculateChange(currentEngagementRate, previousEngagementRate)
            }
          });
        } else {
          setTrendData(null);
        }
      };

      calculateTrendsFromPosts();

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
        } else if (post.platform === 'youtube') {
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
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white animate-pulse ${platform.name === 'threads' ? 'hidden md:flex' : ''}`}
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
          {/* Show preview banner when no accounts are connected */}
          {!hasConnectedAccounts && <PreviewDataBanner />}
          <Card variant="glass" className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Date Selector - Full width on mobile */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                </div>
                <select
                  className="flex-1 sm:flex-initial bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  {dateRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {/* Desktop loading indicator - shown immediately after dropdown */}
                {refreshing && (
                  <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 ml-3">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Loading analytics data...</span>
                  </div>
                )}
              </div>

              {/* Action Buttons - Stack on mobile */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Mobile loading indicator - hidden on desktop */}
                {refreshing && (
                  <div className="flex sm:hidden items-center gap-2 text-xs text-gray-500">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Loading analytics data...</span>
                  </div>
                )}
                <div className="flex gap-2 sm:gap-3 sm:ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex-1 sm:flex-initial hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-xs sm:text-sm px-3 sm:px-4"
                  >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="gradient"
                    size="sm"
                    className="flex-1 sm:flex-initial text-xs sm:text-sm px-3 sm:px-4"
                    onClick={handleExport}
                    disabled={!analyticsData || loading || refreshing}
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Platform Coverage Info */}
          <Card variant="elevated" className="p-3 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Platform Coverage</p>
                <p className="mt-0.5">Analytics are currently available for Facebook, Instagram, Threads, Bluesky, Pinterest, TikTok, and YouTube. Longer date ranges may take more time to load as we fetch complete data from all your posts.</p>
              </div>
            </div>
          </Card>
          
          {/* Overview Cards */}
          <OverviewCards analyticsData={analyticsData} trendData={trendData} dateRange={dateRange} />

          {/* Analytics Cards - Mobile ordering with flex, Desktop uses two separate grids */}
          <div className="flex flex-col gap-4 sm:gap-8">
            {/* First Row Grid - Engagement + Platform (on desktop only) */}
            <div className="contents md:grid md:grid-cols-2 md:gap-4 md:sm:gap-8">
              {/* Engagement Chart - 2nd on mobile, left on desktop */}
              <Card variant="elevated" className="order-2 md:order-none overflow-hidden">
                <CardHeader variant="gradient" className="px-4 py-3 sm:px-6 sm:py-4">
                  <CardTitle className="text-white text-base sm:text-xl">Engagement Over Time</CardTitle>
                  <CardDescription className="text-purple-100 text-xs sm:text-sm">
                    Track likes, comments, and shares across all platforms
                  </CardDescription>
                </CardHeader>
                <CardContent className="bg-gradient-to-b from-white to-gray-50 p-3 sm:p-6">
                  <EngagementChart
                    analyticsData={analyticsData}
                    posts={analyticsData?.currentPeriodPosts || []}
                  />
                </CardContent>
              </Card>

              {/* Platform Breakdown - 3rd on mobile, right on desktop */}
              <Card variant="elevated" className="order-3 md:order-none overflow-hidden">
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

            {/* Second Row Grid - Reach + Top Posts (on desktop only) */}
            <div className="contents md:grid md:grid-cols-3 md:gap-4 md:sm:gap-8 md:items-stretch">
              {/* Reach Chart - 1st on mobile, left 2/3 on desktop */}
              <Card variant="glass" className="order-1 md:order-none md:col-span-2 overflow-hidden flex flex-col h-full">
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

              {/* Top Posts - 4th on mobile, right 1/3 on desktop */}
              <Card variant="glass" className="order-4 md:order-none overflow-hidden flex flex-col h-full">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
                  <CardTitle variant="gradient" className="text-base sm:text-xl">Top Performing Posts</CardTitle>
                  <CardDescription className="text-gray-600 text-xs sm:text-sm">
                    Your best content from the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent className="bg-white/50 backdrop-blur-sm p-3 sm:p-6 flex-1 flex flex-col">
                  <TopPosts
                    analyticsData={analyticsData}
                    posts={analyticsData?.currentPeriodPosts || []}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Platform Insights with Tabs */}
          <PlatformInsightsTabs className="mt-8" />
        </div>
      </SubscriptionGate>
    </div>
  )
}
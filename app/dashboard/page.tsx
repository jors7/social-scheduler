'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  Calendar,
  FileText,
  TrendingUp,
  Users,
  Clock,
  PlusCircle,
  ArrowUpRight,
  Infinity,
  Zap,
  Info,
  ChevronRight,
  ChevronLeft,
  Sparkles as SparklesIcon,
  Command,
  ArrowUp,
  ArrowDown,
  Minus,
  Activity,
  Target,
  Share2,
  MessageSquare,
  Heart,
  Eye,
  Send,
  Lightbulb,
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { getClientSubscription } from '@/lib/subscription/client'
import { Crown, Sparkles, RefreshCw, Play } from 'lucide-react'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/plans'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'
import { useOnboarding } from '@/providers/onboarding-provider'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

interface PostData {
  id: string
  content: string
  platforms: string[]
  status: string
  scheduled_for?: string
  posted_at?: string
  created_at: string
  post_results?: any[]
  media_urls?: any[] | string
  platform_media_url?: string
}

interface DashboardStats {
  totalPosts: number
  scheduledPosts: number
  draftPosts: number
  postedPosts: number
  totalReach: number
  avgEngagement: number
}

interface UsageData {
  posts_used: number
  posts_limit: number
  ai_suggestions_used: number
  ai_suggestions_limit: number
  connected_accounts_used: number
  connected_accounts_limit: number
}

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📷',
  facebook: 'f',
  linkedin: 'in',
  youtube: '▶',
  tiktok: '♪',
  threads: '@',
  bluesky: '🦋',
  pinterest: 'P',
}


export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPosts, setRecentPosts] = useState<PostData[]>([])
  const [upcomingSchedule, setUpcomingSchedule] = useState<{date: string, posts: number, platforms: string[], dateObj: Date, media_urls: string[], postGroups: string[][]}[]>([])
  const [loading, setLoading] = useState(true)
  const [usageLoading, setUsageLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [activeTab, setActiveTab] = useState<'recent' | 'scheduled' | 'drafts'>('recent')
  const [showTip, setShowTip] = useState(true)
  const [greeting, setGreeting] = useState('')
  const [draftPosts, setDraftPosts] = useState<PostData[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([])
  const [showAITooltip, setShowAITooltip] = useState(false)
  const [showPostsTooltip, setShowPostsTooltip] = useState(false)
  const [analyticsCache, setAnalyticsCache] = useState<{ data: any, timestamp: number } | null>(null)
  const [fetchingAnalytics, setFetchingAnalytics] = useState(false)
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false)
  const [analyticsStats, setAnalyticsStats] = useState<DashboardStats | null>(null)
  const activityOverviewRef = useRef<HTMLDivElement>(null)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

  // Store scheduled/draft counts in refs to avoid stale closure issues
  const scheduledCountRef = useRef<number>(0)
  const draftCountRef = useRef<number>(0)

  // Onboarding integration
  const {
    isOnboardingOpen,
    hasCompletedOnboarding,
    isLoading: isLoadingOnboarding,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    closeOnboarding
  } = useOnboarding()

  // Array of rotating pro tips
  const proTips = [
    {
      title: "Peak Posting Times",
      text: "Schedule your posts during peak hours (9-10 AM or 7-9 PM) for maximum engagement"
    },
    {
      title: "Use AI Wisely",
      text: "Try different AI tones to find what resonates with your audience - Professional for LinkedIn, Casual for Twitter"
    },
    {
      title: "Visual Content Wins",
      text: "Posts with images get 2.3x more engagement. Always include eye-catching visuals"
    },
    {
      title: "Consistency is Key",
      text: "Post regularly at the same times each week to build audience expectations and loyalty"
    },
    {
      title: "Platform-Specific Content",
      text: "Customize your message for each platform - what works on Instagram may not work on LinkedIn"
    },
    {
      title: "Track Your Analytics",
      text: "Check your analytics weekly to understand what content performs best and adjust your strategy"
    },
    {
      title: "Hashtag Strategy",
      text: "Use 3-5 relevant hashtags per post. Mix popular and niche tags for better reach"
    },
    {
      title: "Engage Back",
      text: "Respond to comments within the first hour of posting to boost algorithmic visibility"
    },
    {
      title: "Video Content Boost",
      text: "Video posts get 48% more views on average. Try mixing in short videos with your image posts"
    },
    {
      title: "Content Batching",
      text: "Create and schedule multiple posts at once to save time and maintain consistency"
    },
    {
      title: "Weekend Planning",
      text: "Weekends often see higher engagement. Don't forget to schedule content for Saturday and Sunday"
    },
    {
      title: "A/B Test Your Content",
      text: "Try different posting times, formats, and styles to discover what works best for your audience"
    }
  ]

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Initialize basic data (instant)
  const initializeBasicData = async () => {
    try {
      const supabase = createClient()

      // Set greeting immediately
      setGreeting(getGreeting())

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Please log in to view your dashboard')
        return null
      }

      // Get subscription status (fast)
      const subData = await getClientSubscription()
      setSubscription(subData)

      setLoading(false) // Allow greeting/buttons to show

      return { user, subscription: subData }
    } catch (error) {
      console.error('Error initializing dashboard:', error)
      setLoading(false)
      return null
    }
  }

  // Fetch usage data (fast - single RPC call)
  const fetchUsageData = async (userId: string, subscription: any) => {
    try {
      const supabase = createClient()

      const { data: usageData, error: usageError } = await supabase
        .rpc('get_usage_summary', { user_uuid: userId })

      if (!usageError && usageData && usageData.length > 0) {
        const usage = usageData[0]
        const planId = (subscription?.planId || 'free') as 'free' | 'starter' | 'professional' | 'enterprise'
        const currentPlan = SUBSCRIPTION_PLANS[planId]
        const enhancedUsage = {
          posts_used: usage.posts_used || 0,
          posts_limit: currentPlan.limits.posts_per_month,
          ai_suggestions_used: usage.ai_suggestions_used || 0,
          ai_suggestions_limit: currentPlan.limits.ai_suggestions_per_month,
          connected_accounts_used: usage.connected_accounts_used || 0,
          connected_accounts_limit: currentPlan.limits.connected_accounts
        }
        setUsage(enhancedUsage)
      } else {
        const planId = (subscription?.planId || 'free') as 'free' | 'starter' | 'professional' | 'enterprise'
        const currentPlan = SUBSCRIPTION_PLANS[planId]
        setUsage({
          posts_used: 0,
          posts_limit: currentPlan.limits.posts_per_month,
          ai_suggestions_used: 0,
          ai_suggestions_limit: currentPlan.limits.ai_suggestions_per_month,
          connected_accounts_used: 0,
          connected_accounts_limit: currentPlan.limits.connected_accounts
        })
      }
    } catch (error) {
      console.error('Error fetching usage data:', error)
    } finally {
      setUsageLoading(false)
    }
  }

  // Fetch posts and schedule data (slower)
  const fetchPostsAndSchedule = async (userId: string, subscription: any) => {
    try {
      const supabase = createClient()

      // Fetch all data concurrently
      const [draftsResult, scheduledResult] = await Promise.all([
        supabase
          .from('drafts')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('scheduled_posts')
          .select('*')
          .eq('user_id', userId)
          .order('scheduled_for', { ascending: false })
      ])
      
      if (draftsResult.error) {
        console.error('Error fetching drafts:', draftsResult.error)
      }
      if (scheduledResult.error) {
        console.error('Error fetching scheduled posts:', scheduledResult.error)
      }
      
      const drafts = draftsResult.data || []
      const scheduled = scheduledResult.data || []
      
      const allPosts = [...drafts, ...scheduled]
      
      // Store drafts for the tabs
      setDraftPosts(drafts)
      
      // Fetch connected social accounts
      try {
        const accountsResponse = await fetch('/api/social-accounts')
        if (accountsResponse.ok) {
          const accounts = await accountsResponse.json()
          const platforms = accounts
            .filter((acc: any) => acc.is_active)
            .map((acc: any) => acc.platform)
          setConnectedPlatforms(platforms)
        }
      } catch (error) {
        console.error('Error fetching social accounts:', error)
      }
      
      // Calculate local stats (for drafts and scheduled)
      const scheduledCount = scheduled.filter((p: PostData) => ['pending', 'posting'].includes(p.status)).length
      const postedCount = scheduled.filter((p: PostData) => ['posted'].includes(p.status)).length
      const draftCount = drafts.length

      // Store in refs for access by analytics function
      scheduledCountRef.current = scheduledCount
      draftCountRef.current = draftCount
      
      // Calculate local stats from database (for immediate display)
      const postedPosts = scheduled.filter((p: PostData) => p.status === 'posted')
      let totalReach = 0
      let totalEngagement = 0
      
      postedPosts.forEach((post: PostData) => {
        if (post.post_results) {
          post.post_results.forEach((result: any) => {
            if (result.success && result.data?.metrics) {
              totalReach += result.data.metrics.views || result.data.metrics.impressions || 0
              totalEngagement += (result.data.metrics.likes || 0) + (result.data.metrics.comments || 0) + (result.data.metrics.shares || 0)
            }
          })
        }
      })
      
      const avgEngagement = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0
      
      // Set initial stats with local data
      setStats({
        totalPosts: allPosts.length,  // Local database count
        scheduledPosts: scheduledCount,
        draftPosts: draftCount,
        postedPosts: postedCount,
        totalReach,
        avgEngagement
      })
      
      // Get recent posts with media URLs from platforms
      try {
        const recentResponse = await fetch('/api/posts/recent-with-media')
        if (recentResponse.ok) {
          const { posts } = await recentResponse.json()
          setRecentPosts(posts || [])
        } else {
          // Fallback to local data if API fails
          const recentPostedPosts = scheduled
            .filter((p: PostData) => p.status === 'posted')
            .sort((a: PostData, b: PostData) => {
              const aDate = new Date(a.posted_at || a.scheduled_for || a.created_at)
              const bDate = new Date(b.posted_at || b.scheduled_for || b.created_at)
              return bDate.getTime() - aDate.getTime()
            })
            .slice(0, 5)
          
          setRecentPosts(recentPostedPosts)
        }
      } catch (error) {
        console.error('Error fetching recent posts with media:', error)
        // Fallback to local data
        const recentPostedPosts = scheduled
          .filter((p: PostData) => p.status === 'posted')
          .sort((a: PostData, b: PostData) => {
            const aDate = new Date(a.posted_at || a.scheduled_for || a.created_at)
            const bDate = new Date(b.posted_at || b.scheduled_for || b.created_at)
            return bDate.getTime() - aDate.getTime()
          })
          .slice(0, 5)
        
        setRecentPosts(recentPostedPosts)
      }
      
      // Calculate upcoming schedule with platforms
      const now = new Date()
      const upcomingPosts = scheduled.filter((p: PostData) => 
        ['pending', 'posting'].includes(p.status) && 
        p.scheduled_for &&
        new Date(p.scheduled_for) > now  // Only show future posts
      )
      
      const scheduleMap = new Map<string, { count: number, platforms: Set<string>, dateObj: Date, media_urls: string[], postGroups: string[][] }>()
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      upcomingPosts.forEach((post: PostData) => {
        const postDate = new Date(post.scheduled_for!)
        let dateKey: string
        
        // Only show as "Today" if the scheduled time hasn't passed yet
        if (postDate.toDateString() === today.toDateString() && postDate > now) {
          dateKey = 'Today'
        } else if (postDate.toDateString() === tomorrow.toDateString()) {
          dateKey = 'Tomorrow'
        } else {
          dateKey = postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
        
        const existing = scheduleMap.get(dateKey) || { count: 0, platforms: new Set<string>(), dateObj: postDate, media_urls: [], postGroups: [] }
        existing.count += 1
        post.platforms.forEach(platform => existing.platforms.add(platform))
        
        // Add this post's platforms as a group
        existing.postGroups.push(post.platforms)
        
        // Collect media URLs (up to 3 per day)
        if (existing.media_urls.length < 3 && post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
          const firstMedia = post.media_urls[0]
          let mediaUrl: string | null = null
          if (typeof firstMedia === 'string') {
            mediaUrl = firstMedia
          } else if (firstMedia && typeof firstMedia === 'object' && firstMedia.url) {
            mediaUrl = firstMedia.url
          }
          if (mediaUrl && !existing.media_urls.includes(mediaUrl)) {
            existing.media_urls.push(mediaUrl)
          }
        }
        
        scheduleMap.set(dateKey, existing)
      })
      
      // Sort by date (chronologically - nearest first)
      const scheduleArray = Array.from(scheduleMap.entries())
        .map(([date, data]) => ({ 
          date, 
          posts: data.count, 
          platforms: Array.from(data.platforms),
          dateObj: data.dateObj,
          media_urls: data.media_urls,
          postGroups: data.postGroups 
        }))
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
        .slice(0, 5)
      
      setUpcomingSchedule(scheduleArray)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setPostsLoading(false)
      setScheduleLoading(false)
    }
  }
  
  // Fetch analytics data from platform APIs
  const fetchAnalyticsData = async () => {
    console.log('[Dashboard] fetchAnalyticsData called')
    if (fetchingAnalytics || analyticsLoaded) {
      console.log('[Dashboard] Skipping fetch - already fetching or loaded')
      return
    }

    setFetchingAnalytics(true)
    try {
      // Fetch data from all platforms in parallel (last 7 days for dashboard)
      console.log('[Dashboard] Fetching analytics from APIs...')
      const [facebookRes, instagramRes, threadsRes, blueskyRes, pinterestRes] = await Promise.all([
        fetch(`/api/analytics/facebook?days=7`),
        fetch(`/api/analytics/instagram?days=7`),
        fetch(`/api/analytics/threads?days=7`),
        fetch(`/api/analytics/bluesky?days=7`),
        fetch(`/api/analytics/pinterest?days=7`)
      ])

      const [facebookData, instagramData, threadsData, blueskyData, pinterestData] = await Promise.all([
        facebookRes.ok ? facebookRes.json() : { metrics: null },
        instagramRes.ok ? instagramRes.json() : { metrics: null },
        threadsRes.ok ? threadsRes.json() : { metrics: null },
        blueskyRes.ok ? blueskyRes.json() : { metrics: null },
        pinterestRes.ok ? pinterestRes.json() : { metrics: null }
      ])

      // Aggregate all metrics
      let totalPosts = 0
      let totalEngagement = 0
      let totalReach = 0
      let totalImpressions = 0

      // Process Facebook data
      if (facebookData.metrics) {
        const metrics = facebookData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalReach
        totalImpressions += metrics.totalImpressions
        console.log('[Dashboard] Facebook metrics:', metrics)
      }

      // Process Instagram data
      if (instagramData.metrics) {
        const metrics = instagramData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalReach
        totalImpressions += metrics.totalImpressions
        console.log('[Dashboard] Instagram metrics:', metrics)
      }

      // Process Threads data
      if (threadsData.metrics) {
        const metrics = threadsData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalViews
        totalImpressions += metrics.totalViews
        console.log('[Dashboard] Threads metrics:', metrics)
      }

      // Process Bluesky data
      if (blueskyData.metrics) {
        const metrics = blueskyData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalReach
        console.log('[Dashboard] Bluesky metrics:', metrics)
      }

      // Process Pinterest data
      if (pinterestData.metrics) {
        const metrics = pinterestData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalImpressions || metrics.totalReach || 0 // Pinterest uses impressions as reach
        totalImpressions += metrics.totalImpressions || 0
        console.log('[Dashboard] Pinterest metrics:', metrics)
      }

      const analyticsData = {
        totalPosts,
        totalEngagement,
        totalReach,
        totalImpressions,
        engagementRate: totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0
      }
      
      console.log('[Dashboard] Analytics data aggregated:', analyticsData)
      
      // Update analytics stats
      // Use refs instead of state to avoid stale closure issues
      const newAnalyticsStats = {
        totalPosts: analyticsData.totalPosts,
        scheduledPosts: scheduledCountRef.current, // Use ref value from database query
        draftPosts: draftCountRef.current, // Use ref value from database query
        postedPosts: analyticsData.totalPosts,
        totalReach: analyticsData.totalReach,
        avgEngagement: analyticsData.engagementRate
      }
      
      console.log('[Dashboard] Setting new analytics stats:', newAnalyticsStats)
      setAnalyticsStats(newAnalyticsStats)
      setAnalyticsLoaded(true)
      setFetchingAnalytics(false)
      
      return analyticsData
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      setAnalyticsLoaded(true)
      setFetchingAnalytics(false)
      return null
    }
  }

  useEffect(() => {
    const loadDashboard = async () => {
      // Step 1: Initialize basic data (greeting, subscription) - instant
      const basicData = await initializeBasicData()
      if (!basicData) return

      // Step 2: Fetch usage data and posts/schedule in parallel for faster loading
      fetchUsageData(basicData.user.id, basicData.subscription)
      fetchPostsAndSchedule(basicData.user.id, basicData.subscription)
    }

    loadDashboard()
  }, [])

  // Auto-rotate tips every 15 seconds
  useEffect(() => {
    if (!showTip) return

    const interval = setInterval(() => {
      setCurrentTipIndex((prevIndex) => (prevIndex + 1) % proTips.length)
    }, 15000) // 15 seconds

    return () => clearInterval(interval)
  }, [showTip, proTips.length])

  // Navigation functions for tips
  const nextTip = () => {
    setCurrentTipIndex((prevIndex) => (prevIndex + 1) % proTips.length)
  }

  const previousTip = () => {
    setCurrentTipIndex((prevIndex) => (prevIndex - 1 + proTips.length) % proTips.length)
  }

  // Trigger analytics loading immediately when component mounts
  useEffect(() => {
    // Always fetch analytics after a short delay
    const timeoutId = setTimeout(() => {
      console.log('[Dashboard] Auto-triggering analytics fetch')
      fetchAnalyticsData()
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  // Auto-trigger onboarding for first-time users
  useEffect(() => {
    if (!isLoadingOnboarding && !hasCompletedOnboarding && !loading) {
      // Delay by 2 seconds to let the dashboard load first
      const timer = setTimeout(() => {
        startOnboarding()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isLoadingOnboarding, hasCompletedOnboarding, loading, startOnboarding])

  const stripHtml = (html: string) => {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  
  const getDisplayStatus = (post: PostData) => {
    if (post.status === 'pending') return 'scheduled'
    if (post.status === 'posted') return 'posted'
    return post.status
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton matching the final layout */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 rounded-2xl p-6 border border-purple-100 shadow-sm animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Greeting skeleton */}
                    <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-64"></div>
                    {/* Badge skeleton */}
                    <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
                  </div>
                  {/* Subtitle skeleton */}
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-80 max-w-full"></div>
                </div>

                {/* Button skeletons */}
                <div className="flex gap-3">
                  <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32"></div>
                  <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-28"></div>
                </div>
              </div>

              {/* Pro Tip skeleton */}
              <div className="bg-white/80 rounded-lg p-3 border border-purple-100 mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="elevated" className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Use analytics stats if loaded, otherwise use local stats
  const displayStats = analyticsStats || stats
  const isUsingPlatformData = analyticsStats !== null
  
  console.log('[Dashboard] Display stats:', {
    analyticsLoaded,
    hasAnalyticsStats: analyticsStats !== null,
    isUsingPlatformData,
    displayStats
  })
  
  const statsData = [
    {
      title: 'Total Posts',
      value: displayStats?.totalPosts.toString() || '0',
      description: isUsingPlatformData ? 'Published on platforms' : 'Local data',
      icon: FileText,
      trend: 'neutral',
      isRealTime: isUsingPlatformData
    },
    {
      title: 'Scheduled',
      value: displayStats?.scheduledPosts.toString() || '0',
      description: 'Ready to post',
      icon: Clock,
      trend: 'neutral',
      isRealTime: false
    },
    {
      title: 'Total Reach',
      value: displayStats?.totalReach ? (displayStats.totalReach > 999 ? `${(displayStats.totalReach / 1000).toFixed(1)}K` : displayStats.totalReach.toString()) : '0',
      description: displayStats?.postedPosts ? `From ${displayStats.postedPosts} posted` : 'No data yet',
      icon: Users,
      trend: displayStats?.totalReach ? 'up' : 'neutral',
      isRealTime: isUsingPlatformData
    },
    {
      title: 'Engagement Rate',
      value: displayStats?.avgEngagement ? `${displayStats.avgEngagement.toFixed(1)}%` : '0%',
      description: displayStats?.totalReach ? 'Average across posts' : 'No data yet',
      icon: TrendingUp,
      trend: displayStats?.avgEngagement ? 'up' : 'neutral',
      isRealTime: isUsingPlatformData
    },
  ]

  return (
    <>
      <div className="space-y-6">
        {/* Welcome Section with Greeting and Tips */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-gray-900">
                    <span className="sm:hidden">Hello! 👋</span>
                    <span className="hidden sm:inline">{greeting && `${greeting}! 👋`}</span>
                  </h1>
                  {subscription && (
                    <Badge className={cn(
                      "px-3 py-1",
                      subscription.hasSubscription 
                        ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    )}>
                      {subscription.hasSubscription ? (
                        <>
                          <Crown className="h-3 w-3 mr-1" />
                          {subscription.planId ? subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1) : 'Free'}
                          {subscription.isTrialing && ' Trial'}
                        </>
                      ) : (
                        'Free Plan'
                      )}
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-base">
                  Here&apos;s what&apos;s happening with your social media today
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {/* Show Start Tour button for new users, Tour button for returning users */}
                {!hasCompletedOnboarding ? (
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={startOnboarding}
                    className="shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start Tour
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={startOnboarding}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Tour
                  </Button>
                )}
                {subscription && !subscription.hasSubscription && (
                  <Link href="/#pricing" className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="hover:bg-purple-50 w-full sm:w-auto">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Upgrade
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            
            {/* Quick Tip Section - Now full width with rotation */}
            {showTip && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-purple-100 mt-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
                    <Lightbulb className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        Pro Tip: {proTips[currentTipIndex].title}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={previousTip}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                          aria-label="Previous tip"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-[10px] text-gray-400 font-medium px-1">
                          {currentTipIndex + 1}/{proTips.length}
                        </span>
                        <button
                          onClick={nextTip}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                          aria-label="Next tip"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">
                      {proTips[currentTipIndex].text}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTip(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    aria-label="Close tip"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <SubscriptionGate feature="dashboard">
        <div className="space-y-6">

      {/* Quick Actions - Redesigned with descriptions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/dashboard/create/new" className="group">
          <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-gray-200 hover:border-purple-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <PlusCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">Create Post</p>
                  <p className="text-xs text-gray-500 mt-0.5">Draft new content</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/posts" className="group">
          <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-gray-200 hover:border-blue-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">View Posts</p>
                  <p className="text-xs text-gray-500 mt-0.5">Manage content</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/calendar" className="group">
          <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-gray-200 hover:border-green-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">Calendar</p>
                  <p className="text-xs text-gray-500 mt-0.5">Schedule posts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/analytics" className="group">
          <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-gray-200 hover:border-orange-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">Analytics</p>
                  <p className="text-xs text-gray-500 mt-0.5">View insights</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/settings" className="group">
          <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-gray-200 hover:border-indigo-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">Accounts</p>
                  <p className="text-xs text-gray-500 mt-0.5">Connect platforms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Usage & Limits - Redesigned with circular progress and explanations */}
      {usage && (
        <Card className="border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-700" />
                  Usage & Limits
                </CardTitle>
                <CardDescription>Track your monthly usage and plan limits</CardDescription>
              </div>
              {subscription && !subscription.hasSubscription && (
                <Link href="/#pricing">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Upgrade for more
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Posts Usage */}
              <div className="text-center relative">
                <div className="relative inline-flex items-center justify-center mb-3">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={usage.posts_limit === -1 ? 0 : `${2 * Math.PI * 36 * (1 - usage.posts_used / usage.posts_limit)}`}
                      className={cn(
                        "transition-all duration-500",
                        usage.posts_used > usage.posts_limit * 0.8 && usage.posts_limit !== -1 ? 'text-red-500' :
                        usage.posts_used > usage.posts_limit * 0.5 && usage.posts_limit !== -1 ? 'text-yellow-500' : 
                        'text-green-500'
                      )}
                    />
                  </svg>
                  <div className="absolute">
                    <FileText className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <p className="font-semibold text-sm text-gray-900">Posts</p>
                <p className="text-xs text-gray-500 mt-1">
                  {usage.posts_used} / {usage.posts_limit === -1 ? '∞' : usage.posts_limit} this month
                </p>
                <button 
                  onClick={() => setShowPostsTooltip(!showPostsTooltip)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mx-auto relative"
                >
                  <HelpCircle className="h-3 w-3" />
                  View plan limits
                </button>
                
                {/* Posts Tooltip */}
                {showPostsTooltip && (
                  <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-white rounded-lg shadow-lg border border-gray-200">
                    <button
                      onClick={() => setShowPostsTooltip(false)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="text-xs font-semibold text-gray-900 mb-2">Monthly Post Limits</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Free:</span>
                        <span className="font-medium">0 posts</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Starter:</span>
                        <span className="font-medium text-green-600">Unlimited</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Professional:</span>
                        <span className="font-medium text-green-600">Unlimited</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Enterprise:</span>
                        <span className="font-medium text-green-600">Unlimited</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">Free plan is currently limited. Upgrade to post unlimited content.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Accounts Usage */}
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center mb-3">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={usage.connected_accounts_limit === -1 ? 0 : `${2 * Math.PI * 36 * (1 - usage.connected_accounts_used / usage.connected_accounts_limit)}`}
                      className={cn(
                        "transition-all duration-500",
                        usage.connected_accounts_used > usage.connected_accounts_limit * 0.8 && usage.connected_accounts_limit !== -1 ? 'text-red-500' :
                        usage.connected_accounts_used > usage.connected_accounts_limit * 0.5 && usage.connected_accounts_limit !== -1 ? 'text-yellow-500' : 
                        'text-blue-500'
                      )}
                    />
                  </svg>
                  <div className="absolute">
                    <Users className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <p className="font-semibold text-sm text-gray-900">Connected Accounts</p>
                <p className="text-xs text-gray-500 mt-1">
                  {usage.connected_accounts_used} / {usage.connected_accounts_limit === -1 ? '∞' : usage.connected_accounts_limit} active
                </p>
                <Link href="/dashboard/settings" className="mt-2 text-xs text-blue-600 hover:text-blue-700 inline-flex justify-center items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  Manage accounts
                </Link>
              </div>

              {/* AI Usage */}
              <div className="text-center relative">
                <div className="relative inline-flex items-center justify-center mb-3">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={usage.ai_suggestions_limit === -1 || usage.ai_suggestions_limit === 0 ? 0 : `${2 * Math.PI * 36 * (1 - usage.ai_suggestions_used / usage.ai_suggestions_limit)}`}
                      className={cn(
                        "transition-all duration-500",
                        usage.ai_suggestions_used > usage.ai_suggestions_limit * 0.8 && usage.ai_suggestions_limit !== -1 && usage.ai_suggestions_limit !== 0 ? 'text-red-500' :
                        usage.ai_suggestions_used > usage.ai_suggestions_limit * 0.5 && usage.ai_suggestions_limit !== -1 && usage.ai_suggestions_limit !== 0 ? 'text-yellow-500' : 
                        'text-purple-500'
                      )}
                    />
                  </svg>
                  <div className="absolute">
                    <SparklesIcon className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <p className="font-semibold text-sm text-gray-900">AI Suggestions</p>
                <p className="text-xs text-gray-500 mt-1">
                  {usage.ai_suggestions_used} / {usage.ai_suggestions_limit === -1 ? '∞' : usage.ai_suggestions_limit} this month
                </p>
                <button 
                  onClick={() => setShowAITooltip(!showAITooltip)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mx-auto relative"
                >
                  <Info className="h-3 w-3" />
                  Learn about AI usage
                </button>
                
                {/* AI Tooltip */}
                {showAITooltip && (
                  <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-white rounded-lg shadow-lg border border-gray-200">
                    <button
                      onClick={() => setShowAITooltip(false)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="text-xs font-semibold text-gray-900 mb-2">AI Caption Generation Limits</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Free:</span>
                        <span className="font-medium">0 captions/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Starter:</span>
                        <span className="font-medium text-purple-600">50 captions/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Professional:</span>
                        <span className="font-medium text-purple-600">150 captions/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Enterprise:</span>
                        <span className="font-medium text-purple-600">300 captions/month</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">AI helps generate engaging captions for your posts.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Posts */}
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader variant="gradient" className="flex flex-row items-center justify-between text-white">
            <div>
              <CardTitle className="text-white text-xl">Recent Posts</CardTitle>
              <CardDescription className="text-purple-100">Your latest social media activity</CardDescription>
            </div>
            <Link href="/dashboard/posts">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {recentPosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm">No posts created yet</p>
                  <Link href="/dashboard/create/new" className="inline-block mt-2">
                    <Button size="sm">Create your first post</Button>
                  </Link>
                </div>
              ) : (
                recentPosts.map((post) => {
                  // Helper function to detect if this is a story post
                  const isStoryPost = () => {
                    if (!post.post_results || !Array.isArray(post.post_results)) return false

                    return post.post_results.some((result: any) => {
                      if (!result.success) return false

                      // Check for Instagram stories
                      if (result.platform === 'instagram' && result.data) {
                        return result.data.type === 'story' || result.type === 'story'
                      }

                      // Check for Facebook stories
                      if (result.platform === 'facebook' && result.data) {
                        return result.data.isStory === true || result.isStory === true
                      }

                      return false
                    })
                  }

                  // Helper function to extract media URL from various sources
                  const getMediaUrl = () => {
                    // First check for platform_media_url from the API
                    if (post.platform_media_url && typeof post.platform_media_url === 'string') {
                      return post.platform_media_url.trim()
                    }

                    // Then check post_results for successfully posted content with media URLs
                    if (post.post_results && Array.isArray(post.post_results)) {
                      for (const result of post.post_results) {
                        if (result.success && result.data) {
                          // Check if the result data contains media information
                          if (result.data.media_url && typeof result.data.media_url === 'string') {
                            return result.data.media_url.trim()
                          }
                          if (result.data.media_urls && Array.isArray(result.data.media_urls) && result.data.media_urls.length > 0) {
                            const firstUrl = result.data.media_urls[0]
                            if (typeof firstUrl === 'string') return firstUrl.trim()
                          }
                        }
                      }
                    }

                    // Fall back to checking the media_urls field directly
                    if (post.media_urls) {
                      // Handle different possible formats of media_urls
                      if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
                        const firstMedia = post.media_urls[0]

                        // If it's a string URL, return it directly
                        if (typeof firstMedia === 'string' && firstMedia.trim() !== '') {
                          // Ensure the URL is properly formatted
                          return firstMedia.trim()
                        }

                        // If it's an object with a url property
                        if (firstMedia && typeof firstMedia === 'object') {
                          // Check for various possible property names
                          if (firstMedia.url && typeof firstMedia.url === 'string') return firstMedia.url.trim()
                          if (firstMedia.media_url && typeof firstMedia.media_url === 'string') return firstMedia.media_url.trim()
                          if (firstMedia.src && typeof firstMedia.src === 'string') return firstMedia.src.trim()
                          if (firstMedia.secure_url && typeof firstMedia.secure_url === 'string') return firstMedia.secure_url.trim()
                        }
                      }

                      // If media_urls is a single string
                      if (typeof post.media_urls === 'string' && post.media_urls.trim() !== '') {
                        return post.media_urls.trim()
                      }
                    }

                    return null
                  }

                  const firstMediaUrl = getMediaUrl()

                  // Check if we have an image thumbnail (for all platforms including YouTube)
                  const hasImageThumbnail = firstMediaUrl && (
                    firstMediaUrl.includes('.jpg') ||
                    firstMediaUrl.includes('.jpeg') ||
                    firstMediaUrl.includes('.png') ||
                    firstMediaUrl.includes('.webp')
                  )

                  // Determine if this should be rendered as a video
                  // Use video tag only if it's actually a video file (not an image thumbnail)
                  const isVideo = !hasImageThumbnail && firstMediaUrl && (
                    firstMediaUrl.includes('.mp4') ||
                    firstMediaUrl.includes('.mov') ||
                    firstMediaUrl.includes('.webm')
                  )


                  // Get display content - use Pinterest-specific fields if available
                  const getDisplayContent = () => {
                    // Check format flags first (for stories/reels/shorts without captions)
                    const postWithFlags = post as any

                    // Check for Facebook Story
                    if (post.platforms?.includes('facebook') && postWithFlags.facebook_as_story) {
                      const content = stripHtml(post.content)
                      return content && content.trim() ? content : 'Facebook Story'
                    }

                    // Check for Facebook Reel
                    if (post.platforms?.includes('facebook') && postWithFlags.facebook_as_reel) {
                      const content = stripHtml(post.content)
                      return content && content.trim() ? content : 'Facebook Reel'
                    }

                    // Check for Instagram Story
                    if (post.platforms?.includes('instagram') && postWithFlags.instagram_as_story) {
                      const content = stripHtml(post.content)
                      return content && content.trim() ? content : 'Instagram Story'
                    }

                    // Check for Instagram Reel
                    if (post.platforms?.includes('instagram') && postWithFlags.instagram_as_reel) {
                      const content = stripHtml(post.content)
                      return content && content.trim() ? content : 'Instagram Reel'
                    }

                    // Check for YouTube Short
                    if (post.platforms?.includes('youtube') && postWithFlags.youtube_as_short) {
                      const content = stripHtml(post.content)
                      return content && content.trim() ? content : 'YouTube Short'
                    }

                    // Fallback: Check if it's a story post via post_results (for old posts)
                    if (isStoryPost()) {
                      // Determine which platform the story is from
                      if (post.platforms.includes('instagram')) {
                        return 'Instagram Story'
                      }
                      if (post.platforms.includes('facebook')) {
                        return 'Facebook Story'
                      }
                      return 'Story'
                    }

                    // Check if this is a Pinterest post with specific content
                    if (post.platforms.includes('pinterest')) {
                      // Type assertion to access Pinterest fields
                      const pinterestPost = post as any

                      // First check if Pinterest fields exist as separate columns
                      if (pinterestPost.pinterest_title || pinterestPost.pinterest_description) {
                        const title = pinterestPost.pinterest_title || ''
                        const description = pinterestPost.pinterest_description || ''
                        // Return only the title, fallback to description if no title
                        return title || description
                      }

                      // Check platform_content JSONB field for Pinterest content
                      if (pinterestPost.platform_content?.pinterest) {
                        // Extract just the title part (before the colon) if it's in "title: description" format
                        const content = pinterestPost.platform_content.pinterest
                        const colonIndex = content.indexOf(':')
                        if (colonIndex > 0) {
                          return content.substring(0, colonIndex).trim()
                        }
                        return content
                      }
                    }

                    // Check if there's platform-specific content for the first platform
                    const postWithPlatformContent = post as any
                    if (postWithPlatformContent.platform_content && post.platforms.length > 0) {
                      const firstPlatform = post.platforms[0]
                      if (postWithPlatformContent.platform_content[firstPlatform]) {
                        return postWithPlatformContent.platform_content[firstPlatform]
                      }
                    }

                    // Check if content is empty or just whitespace
                    const trimmedContent = post.content?.trim() || ''

                    // If content is empty, show generic placeholder
                    if (!trimmedContent) {
                      return 'Untitled Post'
                    }

                    // Fall back to regular content
                    return post.content || ''
                  }
                  
                  const displayContent = getDisplayContent()
                  const truncatedContent = stripHtml(displayContent).slice(0, 60)
                  
                  return (
                    <div key={post.id} className="flex items-center justify-between p-5 border border-gray-100 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex-1">
                        <p className="font-medium line-clamp-1">{truncatedContent}{truncatedContent.length >= 60 ? '...' : ''}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {post.platforms.map((platform) => (
                            <span
                              key={platform}
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                platform === 'facebook' && 'bg-[#1877F2]/10 text-[#1877F2]',
                                platform === 'instagram' && 'bg-purple-500/10 text-purple-600',
                                platform === 'twitter' && 'bg-black/10 text-gray-900',
                                platform === 'linkedin' && 'bg-[#0A66C2]/10 text-[#0A66C2]',
                                platform === 'threads' && 'bg-black/10 text-gray-900',
                                platform === 'bluesky' && 'bg-[#00A8E8]/10 text-[#00A8E8]',
                                platform === 'youtube' && 'bg-[#FF0000]/10 text-[#FF0000]',
                                platform === 'tiktok' && 'bg-black/10 text-gray-900',
                                platform === 'pinterest' && 'bg-[#E60023]/10 text-[#E60023]',
                                !['facebook', 'instagram', 'twitter', 'linkedin', 'threads', 'bluesky', 'youtube', 'tiktok', 'pinterest'].includes(platform) && 'bg-gray-500/10 text-gray-700'
                              )}
                            >
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </span>
                          ))}
                          <span className="text-xs text-gray-500">
                            {post.scheduled_for 
                              ? formatDate(post.scheduled_for)
                              : post.posted_at 
                              ? formatDate(post.posted_at)
                              : formatDate(post.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        {firstMediaUrl ? (
                          isVideo ? (
                            <video
                              src={firstMediaUrl}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              muted
                              preload="metadata"
                              onError={(e) => {
                                // Replace video with placeholder on error
                                const placeholder = document.createElement('div')
                                placeholder.className = 'w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center'
                                placeholder.innerHTML = '<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>'
                                e.currentTarget.parentNode?.replaceChild(placeholder, e.currentTarget)
                              }}
                            />
                          ) : (
                            <img
                              src={firstMediaUrl}
                              alt="Post media"
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              onError={(e) => {
                                // Replace image with placeholder on error
                                const placeholder = document.createElement('div')
                                placeholder.className = 'w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center'
                                placeholder.innerHTML = '<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>'
                                e.currentTarget.parentNode?.replaceChild(placeholder, e.currentTarget)
                              }}
                            />
                          )
                        ) : (
                          <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader variant="gradient" className="flex flex-row items-center justify-between text-white">
            <div>
              <CardTitle className="text-white text-xl">Upcoming Schedule</CardTitle>
              <CardDescription className="text-purple-100">Posts scheduled for the next few days</CardDescription>
            </div>
            <Link href="/dashboard/calendar">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <Calendar className="mr-1 h-4 w-4" />
                Calendar
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {upcomingSchedule.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm">No upcoming posts scheduled</p>
                  <Link href="/dashboard/calendar" className="inline-block mt-2">
                    <Button size="sm" variant="outline">View Calendar</Button>
                  </Link>
                </div>
              ) : (
                upcomingSchedule.map((day) => {
                  // Use vertical mobile layout only for days with 3+ posts
                  const hasMany = day.posts >= 3
                  // Show 4 thumbnails on mobile, 2 on desktop for days with many posts
                  const mobileLimit = 4
                  const desktopLimit = 2

                  return (
                    <div
                      key={day.date}
                      className={cn(
                        "flex items-center justify-between p-5 border border-gray-100 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-r from-gray-50 to-white",
                        hasMany && "flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5"
                      )}
                    >
                      <div className={cn("flex-1", hasMany && "min-w-0 w-full sm:w-auto")}>
                        <span className={cn("font-medium", hasMany && "text-sm sm:text-base")}>
                          {day.date}, {day.dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-sm text-gray-600", hasMany && "text-xs sm:text-sm")}>
                            {day.posts} post{day.posts !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center gap-3",
                        hasMany && "w-full sm:w-auto flex-col sm:flex-row gap-2 sm:gap-3"
                      )}>
                        {/* Media thumbnails */}
                        {day.media_urls.length > 0 && (
                          <div className="flex gap-1">
                            {/* Show more thumbnails on mobile (4) than desktop (2) for hasMany */}
                            {(hasMany ? day.media_urls.slice(0, mobileLimit) : day.media_urls).map((url, index) => {
                              // Check if this is a video URL
                              const isVideo = url && (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('.avi'))
                              // Hide thumbnails 3 and 4 on desktop (index 2 and 3)
                              const isHiddenOnDesktop = hasMany && index >= desktopLimit

                              return (
                                <div key={index} className={cn(
                                  "flex-shrink-0",
                                  isHiddenOnDesktop && "sm:hidden"
                                )}>
                                  {isVideo ? (
                                    <video
                                      src={url}
                                      className={hasMany ? "w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-200" : "w-16 h-16 object-cover rounded-lg border border-gray-200"}
                                      muted
                                      preload="metadata"
                                      onError={(e) => {
                                        // Replace video with placeholder on error
                                        const placeholder = document.createElement('div')
                                        placeholder.className = hasMany ? 'w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center' : 'w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center'
                                        placeholder.innerHTML = hasMany ? '<svg class="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>' : '<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>'
                                        e.currentTarget.parentNode?.replaceChild(placeholder, e.currentTarget)
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={url}
                                      alt="Scheduled post media"
                                      className={hasMany ? "w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-200" : "w-16 h-16 object-cover rounded-lg border border-gray-200"}
                                      onError={(e) => {
                                        // Replace image with placeholder on error
                                        const placeholder = document.createElement('div')
                                        placeholder.className = hasMany ? 'w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center' : 'w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center'
                                        placeholder.innerHTML = hasMany ? '<svg class="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>' : '<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>'
                                        e.currentTarget.parentNode?.replaceChild(placeholder, e.currentTarget)
                                      }}
                                    />
                                  )}
                                </div>
                              )
                            })}
                            {/* +X indicator - show different counts for mobile vs desktop */}
                            {hasMany && day.posts > mobileLimit && (
                              <div className="flex-shrink-0 sm:hidden">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">+{day.posts - mobileLimit}</span>
                                </div>
                              </div>
                            )}
                            {hasMany && day.posts > desktopLimit && (
                              <div className="flex-shrink-0 hidden sm:flex">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">+{day.posts - desktopLimit}</span>
                                </div>
                              </div>
                            )}
                            {!hasMany && day.posts > day.media_urls.length && (
                              <div className="flex-shrink-0">
                                <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                                  <FileText className="h-8 w-8 text-gray-400" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {day.media_urls.length === 0 && (
                          <div className="flex-shrink-0">
                            <div className={hasMany ? "w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" : "w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center"}>
                              <FileText className={hasMany ? "h-6 w-6 sm:h-8 sm:w-8 text-gray-400" : "h-8 w-8 text-gray-400"} />
                            </div>
                          </div>
                        )}
                        {/* Platform icons grouped by post */}
                        <div className={cn(
                          "flex gap-2",
                          hasMany && "flex-wrap gap-1 sm:gap-2"
                        )}>
                          {day.postGroups.map((postPlatforms, groupIndex) => (
                            <div key={groupIndex} className={cn(
                              "flex gap-0.5 bg-indigo-100 rounded-md p-1",
                              hasMany && "p-0.5 sm:p-1"
                            )}>
                              {postPlatforms.map((platform) => (
                                <div
                                  key={`${groupIndex}-${platform}`}
                                  className={hasMany ? "w-5 h-5 sm:w-6 sm:h-6 bg-white rounded flex items-center justify-center text-[10px] sm:text-xs border border-indigo-200" : "w-6 h-6 bg-white rounded flex items-center justify-center text-xs border border-indigo-200"}
                                  title={platform}
                                >
                                  {platformIcons[platform] || platform[0].toUpperCase()}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Stats Overview - Improved Design with Lazy Loading */}
          <div ref={activityOverviewRef} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gray-700" />
                    Activity Overview
                    {fetchingAnalytics && (
                      <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                    )}
                  </h2>
                  <Badge variant="outline" className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200">
                    Last 7 days
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Your social media performance at a glance
                  {analyticsCache && isUsingPlatformData && (
                    <span className="hidden sm:inline text-xs text-gray-400 ml-2">
                      • Updated {Math.floor((Date.now() - analyticsCache.timestamp) / 60000)} min ago
                    </span>
                  )}
                </p>
              </div>
              <Link href="/dashboard/analytics" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                  View Details
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            
            {/* Show loading state if analytics not loaded yet */}
            {!analyticsLoaded ? (
              <div className="flex flex-col items-center justify-center py-12">
                {/* Platform icons */}
                <div className="flex gap-4 mb-6">
                  {[
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="#1877F2" className="w-8 h-8">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )
                    },
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="url(#instagram-gradient-loading)" className="w-8 h-8">
                          <defs>
                            <linearGradient id="instagram-gradient-loading" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#833AB4" />
                              <stop offset="50%" stopColor="#F56040" />
                              <stop offset="100%" stopColor="#FCAF45" />
                            </linearGradient>
                          </defs>
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                        </svg>
                      )
                    },
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-gray-800">
                          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/>
                        </svg>
                      )
                    },
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="#00A8E8" className="w-8 h-8">
                          <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/>
                        </svg>
                      )
                    },
                  ].map((platform, idx) => (
                    <div key={idx}
                         className="opacity-60"
                         style={{
                           animation: `pulse 2s ease-in-out ${idx * 0.2}s infinite`
                         }}>
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
                
                <p className="text-sm text-gray-500 mt-4">
                  {fetchingAnalytics ? 'Loading platform analytics...' : 'Preparing analytics...'}
                </p>
                
                <style jsx>{`
                  @keyframes loading {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                  }
                  @keyframes pulse {
                    0%, 100% { 
                      opacity: 0.6;
                      transform: scale(1);
                    }
                    50% { 
                      opacity: 1;
                      transform: scale(1.1);
                    }
                  }
                `}</style>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statsData.map((stat, index) => {
                const colors = [
                  { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
                  { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
                  { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
                  { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' }
                ]
                const color = colors[index]
                
                // Get trend icon
                const getTrendIcon = () => {
                  if (stat.trend === 'up') return <ArrowUp className="h-3 w-3 text-green-500" />
                  if (stat.trend === 'down') return <ArrowDown className="h-3 w-3 text-red-500" />
                  return <Minus className="h-3 w-3 text-gray-400" />
                }
                
                return (
                  <div key={stat.title} className="relative">
                    <div className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn("p-2 rounded-lg", color.bg)}>
                          <stat.icon className={cn("h-5 w-5", color.text)} />
                        </div>
                        {getTrendIcon()}
                      </div>
                      
                      <div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">
                          {stat.value}
                        </p>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                          {stat.title}
                          {stat.isRealTime && (
                            <span className="ml-1 text-[10px] font-normal text-blue-500 lowercase">
                              • live
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {stat.description}
                        </p>
                      </div>
                      
                      {/* Info tooltip on hover */}
                      <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Info className="h-3 w-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                )
              })}
              </div>
            )}
            
            {/* Additional helpful context */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-900">Tip: Boost your engagement</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Posts with images get 2.3x more engagement. Try adding visuals to your next post!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SubscriptionGate>
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={isOnboardingOpen}
        onClose={closeOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
    </>
  )
}
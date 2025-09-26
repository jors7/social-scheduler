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
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { getClientSubscription } from '@/lib/subscription/client'
import { Crown, Sparkles, RefreshCw } from 'lucide-react'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/plans'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'

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
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient()
      
      // Set greeting
      setGreeting(getGreeting())
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Please log in to view your dashboard')
        return
      }
      
      // Get subscription status
      const subData = await getClientSubscription()
      setSubscription(subData)
      
      // Get usage data
      const { data: usageData, error: usageError } = await supabase
        .rpc('get_usage_summary', { user_uuid: user.id })
      
      if (!usageError && usageData && usageData.length > 0) {
        const usage = usageData[0]
        const currentPlan = SUBSCRIPTION_PLANS[subData?.planId || 'free']
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
        const currentPlan = SUBSCRIPTION_PLANS[subData?.planId || 'free']
        setUsage({
          posts_used: 0,
          posts_limit: currentPlan.limits.posts_per_month,
          ai_suggestions_used: 0,
          ai_suggestions_limit: currentPlan.limits.ai_suggestions_per_month,
          connected_accounts_used: 0,
          connected_accounts_limit: currentPlan.limits.connected_accounts
        })
      }
      
      // Fetch all data concurrently
      const [draftsResult, scheduledResult] = await Promise.all([
        supabase
          .from('drafts')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('scheduled_posts')
          .select('*')
          .eq('user_id', user.id)
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
      
      // Fetch analytics data from platform APIs
      const analyticsData = await fetchAnalyticsData()
      
      if (analyticsData) {
        // Use real platform data for metrics
        setStats({
          totalPosts: analyticsData.totalPosts,  // Real posts from platforms
          scheduledPosts: scheduledCount,  // From local database
          draftPosts: draftCount,  // From local database
          postedPosts: analyticsData.totalPosts,  // Same as totalPosts from platforms
          totalReach: analyticsData.totalReach,  // Real reach from platforms
          avgEngagement: analyticsData.engagementRate  // Real engagement rate from platforms
        })
      } else {
        // Fallback to local data if API fails
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
        
        setStats({
          totalPosts: allPosts.length,  // Local database count
          scheduledPosts: scheduledCount,
          draftPosts: draftCount,
          postedPosts: postedCount,
          totalReach,
          avgEngagement
        })
      }
      
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
        .slice(0, 4)
      
      setUpcomingSchedule(scheduleArray)
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch analytics data from platform APIs with caching
  const fetchAnalyticsData = async () => {
    // Check cache first
    if (analyticsCache && Date.now() - analyticsCache.timestamp < CACHE_DURATION) {
      return analyticsCache.data
    }

    setFetchingAnalytics(true)
    try {
      // Fetch data from all platforms in parallel (last 7 days for dashboard)
      const [facebookRes, instagramRes, threadsRes, blueskyRes] = await Promise.all([
        fetch(`/api/analytics/facebook?days=7`),
        fetch(`/api/analytics/instagram?days=7`),
        fetch(`/api/analytics/threads?days=7`),
        fetch(`/api/analytics/bluesky?days=7`)
      ])

      const [facebookData, instagramData, threadsData, blueskyData] = await Promise.all([
        facebookRes.ok ? facebookRes.json() : { metrics: null },
        instagramRes.ok ? instagramRes.json() : { metrics: null },
        threadsRes.ok ? threadsRes.json() : { metrics: null },
        blueskyRes.ok ? blueskyRes.json() : { metrics: null }
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
      }

      // Process Instagram data
      if (instagramData.metrics) {
        const metrics = instagramData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalReach
        totalImpressions += metrics.totalImpressions
      }

      // Process Threads data
      if (threadsData.metrics) {
        const metrics = threadsData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalViews
        totalImpressions += metrics.totalViews
      }

      // Process Bluesky data
      if (blueskyData.metrics) {
        const metrics = blueskyData.metrics
        totalPosts += metrics.totalPosts
        totalEngagement += metrics.totalEngagement
        totalReach += metrics.totalReach
      }

      const analyticsData = {
        totalPosts,
        totalEngagement,
        totalReach,
        totalImpressions,
        engagementRate: totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0
      }

      // Update cache
      setAnalyticsCache({ data: analyticsData, timestamp: Date.now() })

      return analyticsData
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      return null
    } finally {
      setFetchingAnalytics(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])
  
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
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Dashboard</h1>
            <p className="text-gray-600 mt-2 text-lg">Welcome back! Here&apos;s your social media overview.</p>
          </div>
          <Link href="/dashboard/create/new">
            <Button variant="gradient" size="lg" className="mt-6 sm:mt-0">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Post
            </Button>
          </Link>
        </div>
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

  const statsData = [
    {
      title: 'Total Posts',
      value: stats?.totalPosts.toString() || '0',
      description: stats?.totalPosts ? 'Published on platforms' : 'No posts yet',
      icon: FileText,
      trend: 'neutral',
      isRealTime: true
    },
    {
      title: 'Scheduled',
      value: stats?.scheduledPosts.toString() || '0',
      description: 'Ready to post',
      icon: Clock,
      trend: 'neutral',
      isRealTime: false
    },
    {
      title: 'Total Reach',
      value: stats?.totalReach ? (stats.totalReach > 999 ? `${(stats.totalReach / 1000).toFixed(1)}K` : stats.totalReach.toString()) : '0',
      description: stats?.postedPosts ? `From ${stats.postedPosts} posted` : 'No data yet',
      icon: Users,
      trend: stats?.totalReach ? 'up' : 'neutral',
      isRealTime: true
    },
    {
      title: 'Engagement Rate',
      value: stats?.avgEngagement ? `${stats.avgEngagement.toFixed(1)}%` : '0%',
      description: stats?.totalReach ? 'Average across posts' : 'No data yet',
      icon: TrendingUp,
      trend: stats?.avgEngagement ? 'up' : 'neutral',
      isRealTime: true
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section with Greeting and Tips */}
      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {greeting && `${greeting}! 👋`}
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
              
              <div className="flex gap-3">
                <Link href="/dashboard/create/new">
                  <Button variant="gradient" size="lg" className="shadow-md hover:shadow-lg transition-all">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create Post
                  </Button>
                </Link>
                {subscription && !subscription.hasSubscription && (
                  <Link href="/#pricing">
                    <Button variant="outline" size="lg" className="hover:bg-purple-50">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Upgrade
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            
            {/* Quick Tip Section - Now full width */}
            {showTip && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-purple-100 flex items-start gap-3 mt-4">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Pro Tip</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Schedule your posts during peak hours (9-10 AM or 7-9 PM) for maximum engagement
                  </p>
                </div>
                <button
                  onClick={() => setShowTip(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
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
                  
                  // Simple check if URL is likely a video based on extension
                  const isVideo = firstMediaUrl && (firstMediaUrl.includes('.mp4') || firstMediaUrl.includes('.mov') || firstMediaUrl.includes('.webm'))
                  
                  
                  // Get display content - use Pinterest-specific fields if available
                  const getDisplayContent = () => {
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
                                "text-xs px-2 py-1 rounded-full font-medium text-white",
                                platform === 'facebook' && 'bg-[#1877F2]',
                                platform === 'instagram' && 'bg-gradient-to-r from-purple-500 to-pink-500',
                                platform === 'twitter' && 'bg-black',
                                platform === 'linkedin' && 'bg-[#0A66C2]',
                                platform === 'threads' && 'bg-black',
                                platform === 'bluesky' && 'bg-[#00A8E8]',
                                platform === 'youtube' && 'bg-[#FF0000]',
                                platform === 'tiktok' && 'bg-black',
                                platform === 'pinterest' && 'bg-[#E60023]',
                                !['facebook', 'instagram', 'twitter', 'linkedin', 'threads', 'bluesky', 'youtube', 'tiktok', 'pinterest'].includes(platform) && 'bg-gray-500'
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
                upcomingSchedule.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-5 border border-gray-100 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex-1">
                      <span className="font-medium">{day.date}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">
                          {day.posts} post{day.posts !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Media thumbnails */}
                      {day.media_urls.length > 0 && (
                        <div className="flex gap-1">
                          {day.media_urls.map((url, index) => (
                            <div key={index} className="flex-shrink-0">
                              <img
                                src={url}
                                alt="Scheduled post media"
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              />
                            </div>
                          ))}
                          {day.posts > day.media_urls.length && (
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
                          <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                        </div>
                      )}
                      {/* Platform icons grouped by post */}
                      <div className="flex gap-2">
                        {day.postGroups.map((postPlatforms, groupIndex) => (
                          <div key={groupIndex} className="flex gap-0.5 bg-indigo-100 rounded-md p-1">
                            {postPlatforms.map((platform) => (
                              <div
                                key={`${groupIndex}-${platform}`}
                                className="w-6 h-6 bg-white rounded flex items-center justify-center text-xs border border-indigo-200"
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
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Stats Overview - Improved Design */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-700" />
                  Activity Overview
                  {fetchingAnalytics && (
                    <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                  )}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Your social media performance at a glance
                  {analyticsCache && (
                    <span className="text-xs text-gray-400 ml-2">
                      • Updated {Math.floor((Date.now() - analyticsCache.timestamp) / 60000)} min ago
                    </span>
                  )}
                </p>
              </div>
              <Link href="/dashboard/analytics">
                <Button variant="outline" size="sm" className="text-xs">
                  View Details
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            
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
  )
}
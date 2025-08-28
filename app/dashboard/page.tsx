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
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { getClientSubscription } from '@/lib/subscription/client'
import { Crown, Sparkles } from 'lucide-react'
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
  const [upcomingSchedule, setUpcomingSchedule] = useState<{date: string, posts: number, platforms: string[], dateObj: Date}[]>([])
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient()
      
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
      
      // Calculate stats
      const scheduledCount = scheduled.filter((p: PostData) => ['pending', 'posting'].includes(p.status)).length
      const postedCount = scheduled.filter((p: PostData) => ['posted'].includes(p.status)).length
      const draftCount = drafts.length
      
      // Calculate engagement from posted posts
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
        totalPosts: allPosts.length,
        scheduledPosts: scheduledCount,
        draftPosts: draftCount,
        postedPosts: postedCount,
        totalReach,
        avgEngagement
      })
      
      // Get recent posts (last 5 posted only)
      const recentPostedPosts = scheduled
        .filter((p: PostData) => p.status === 'posted')
        .sort((a: PostData, b: PostData) => {
          const aDate = new Date(a.posted_at || a.scheduled_for || a.created_at)
          const bDate = new Date(b.posted_at || b.scheduled_for || b.created_at)
          return bDate.getTime() - aDate.getTime()
        })
        .slice(0, 5)
      
      setRecentPosts(recentPostedPosts)
      
      // Calculate upcoming schedule with platforms
      const now = new Date()
      const upcomingPosts = scheduled.filter((p: PostData) => 
        ['pending', 'posting'].includes(p.status) && 
        p.scheduled_for &&
        new Date(p.scheduled_for) > now  // Only show future posts
      )
      
      const scheduleMap = new Map<string, { count: number, platforms: Set<string>, dateObj: Date }>()
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
        
        const existing = scheduleMap.get(dateKey) || { count: 0, platforms: new Set<string>(), dateObj: postDate }
        existing.count += 1
        post.platforms.forEach(platform => existing.platforms.add(platform))
        scheduleMap.set(dateKey, existing)
      })
      
      // Sort by date (chronologically - nearest first)
      const scheduleArray = Array.from(scheduleMap.entries())
        .map(([date, data]) => ({ 
          date, 
          posts: data.count, 
          platforms: Array.from(data.platforms),
          dateObj: data.dateObj 
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
      description: `${stats?.draftPosts || 0} drafts, ${stats?.scheduledPosts || 0} scheduled`,
      icon: FileText,
      trend: 'neutral'
    },
    {
      title: 'Scheduled',
      value: stats?.scheduledPosts.toString() || '0',
      description: 'Ready to post',
      icon: Clock,
      trend: 'neutral'
    },
    {
      title: 'Total Reach',
      value: stats?.totalReach ? (stats.totalReach > 999 ? `${(stats.totalReach / 1000).toFixed(1)}K` : stats.totalReach.toString()) : '0',
      description: `From ${stats?.postedPosts || 0} posted`,
      icon: Users,
      trend: stats?.totalReach ? 'up' : 'neutral'
    },
    {
      title: 'Engagement Rate',
      value: stats?.avgEngagement ? `${stats.avgEngagement.toFixed(1)}%` : '0%',
      description: stats?.totalReach ? 'Average across posts' : 'No data yet',
      icon: TrendingUp,
      trend: stats?.avgEngagement ? 'up' : 'neutral'
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Dashboard</h1>
              {subscription && (
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                  subscription.hasSubscription 
                    ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border border-purple-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200"
                )}>
                  {subscription.hasSubscription ? (
                    <>
                      <Crown className="h-3 w-3" />
                      {subscription.planId ? subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1) : 'Free'}
                      {subscription.isTrialing && ' Trial'}
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      Free Plan
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-gray-600 mt-2 text-lg">
              Welcome back! Here&apos;s your social media overview.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 sm:mt-0">
          <Link href="/dashboard/create/new">
            <Button variant="gradient" size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Post
            </Button>
          </Link>
          {subscription && !subscription.hasSubscription && (
            <Link href="/#pricing">
              <Button variant="gradient-outline" size="lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Upgrade
              </Button>
            </Link>
          )}
          {subscription && subscription.hasSubscription && (
            <Link href="/dashboard/billing">
              <Button variant="outline" size="icon">
                <Crown className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <SubscriptionGate feature="dashboard">
        <div className="space-y-8">

      {/* Quick Actions */}
      <Card variant="elevated">
        <CardHeader className="pb-4">
          <CardTitle variant="gradient" className="text-xl flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Link href="/dashboard/create/new">
              <Button variant="outline" className="w-full justify-start hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" size="sm">
                <div className="p-1 bg-purple-100 rounded-lg mr-3">
                  <PlusCircle className="h-4 w-4 text-purple-600" />
                </div>
                New Post
              </Button>
            </Link>
            <Link href="/dashboard/posts">
              <Button variant="outline" className="w-full justify-start hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" size="sm">
                <div className="p-1 bg-blue-100 rounded-lg mr-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                View Posts
              </Button>
            </Link>
            <Link href="/dashboard/calendar">
              <Button variant="outline" className="w-full justify-start hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" size="sm">
                <div className="p-1 bg-green-100 rounded-lg mr-3">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                Calendar
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="w-full justify-start hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" size="sm">
                <div className="p-1 bg-orange-100 rounded-lg mr-3">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                Analytics
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="outline" className="w-full justify-start hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" size="sm">
                <div className="p-1 bg-indigo-100 rounded-lg mr-3">
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                Accounts
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {usage && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card variant="gradient" className="overflow-hidden">
            <CardHeader className="pb-4 bg-white/50 backdrop-blur-sm">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg text-white">
                  <FileText className="h-5 w-5" />
                </div>
                Posts This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used this month</span>
                  <span className={cn(
                    "font-medium flex items-center gap-1",
                    usage.posts_used > usage.posts_limit * 0.8 && usage.posts_limit !== -1 ? 'text-red-600' :
                    usage.posts_used > usage.posts_limit * 0.5 && usage.posts_limit !== -1 ? 'text-yellow-600' : 
                    'text-green-600'
                  )}>
                    <span>{usage.posts_used}</span>
                    <span>/</span>
                    {usage.posts_limit === -1 ? (
                      <Infinity className="h-4 w-4" />
                    ) : (
                      <span>{usage.posts_limit}</span>
                    )}
                  </span>
                </div>
                {usage.posts_limit !== -1 && (
                  <Progress 
                    value={(usage.posts_used / usage.posts_limit) * 100} 
                    className="h-2"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card variant="gradient" className="overflow-hidden">
            <CardHeader className="pb-4 bg-white/50 backdrop-blur-sm">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg text-white">
                  <Users className="h-5 w-5" />
                </div>
                Connected Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active accounts</span>
                  <span className={cn(
                    "font-medium flex items-center gap-1",
                    usage.connected_accounts_used > usage.connected_accounts_limit * 0.8 && usage.connected_accounts_limit !== -1 ? 'text-red-600' :
                    usage.connected_accounts_used > usage.connected_accounts_limit * 0.5 && usage.connected_accounts_limit !== -1 ? 'text-yellow-600' : 
                    'text-green-600'
                  )}>
                    <span>{usage.connected_accounts_used}</span>
                    <span>/</span>
                    {usage.connected_accounts_limit === -1 ? (
                      <Infinity className="h-4 w-4" />
                    ) : (
                      <span>{usage.connected_accounts_limit}</span>
                    )}
                  </span>
                </div>
                {usage.connected_accounts_limit !== -1 && (
                  <Progress 
                    value={(usage.connected_accounts_used / usage.connected_accounts_limit) * 100} 
                    className="h-2"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card variant="gradient" className="overflow-hidden">
            <CardHeader className="pb-4 bg-white/50 backdrop-blur-sm">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used this month</span>
                  <span className={cn(
                    "font-medium flex items-center gap-1",
                    usage.ai_suggestions_used > usage.ai_suggestions_limit * 0.8 && usage.ai_suggestions_limit !== -1 && usage.ai_suggestions_limit !== 0 ? 'text-red-600' :
                    usage.ai_suggestions_used > usage.ai_suggestions_limit * 0.5 && usage.ai_suggestions_limit !== -1 && usage.ai_suggestions_limit !== 0 ? 'text-yellow-600' : 
                    'text-green-600'
                  )}>
                    <span>{usage.ai_suggestions_used}</span>
                    <span>/</span>
                    {usage.ai_suggestions_limit === -1 ? (
                      <Infinity className="h-4 w-4" />
                    ) : (
                      <span>{usage.ai_suggestions_limit}</span>
                    )}
                  </span>
                </div>
                {usage.ai_suggestions_limit !== -1 && usage.ai_suggestions_limit !== 0 && (
                  <Progress 
                    value={(usage.ai_suggestions_used / usage.ai_suggestions_limit) * 100} 
                    className="h-2"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
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
                recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between p-5 border border-gray-100 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex-1">
                      <p className="font-medium line-clamp-1">{stripHtml(post.content).slice(0, 60)}...</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          getDisplayStatus(post) === 'scheduled' 
                            ? 'bg-blue-100 text-blue-600' 
                            : getDisplayStatus(post) === 'posted'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          {getDisplayStatus(post)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {post.scheduled_for 
                            ? formatDate(post.scheduled_for)
                            : post.posted_at 
                            ? formatDate(post.posted_at)
                            : formatDate(post.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {post.platforms.map((platform) => (
                        <div
                          key={platform}
                          className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs"
                          title={platform}
                        >
                          {platformIcons[platform] || platform[0].toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
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
                    <div className="flex gap-1">
                      {day.platforms.map((platform) => (
                        <div
                          key={platform}
                          className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs"
                          title={platform}
                        >
                          {platformIcons[platform] || platform[0].toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Stats Grid - Activity Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statsData.map((stat, index) => {
              const gradientColors = [
                'from-purple-500 to-purple-600',
                'from-blue-500 to-blue-600', 
                'from-green-500 to-green-600',
                'from-orange-500 to-orange-600'
              ]
              return (
                <Card key={stat.title} variant="interactive" className="overflow-hidden group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
                    <div className={`absolute inset-0 bg-gradient-to-r ${gradientColors[index]} opacity-5 group-hover:opacity-10 transition-opacity duration-200`}></div>
                    <CardTitle className="text-sm font-medium relative z-10">{stat.title}</CardTitle>
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${gradientColors[index]} relative z-10`}>
                      <stat.icon className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-3xl font-bold mb-1">{stat.value}</div>
                    <p className={cn(
                      "text-sm",
                      stat.trend === 'up' ? 'text-green-600' : 'text-gray-600'
                    )}>
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </SubscriptionGate>
    </div>
  )
}
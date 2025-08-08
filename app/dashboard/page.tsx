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
  Infinity
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
  const [upcomingSchedule, setUpcomingSchedule] = useState<{date: string, posts: number}[]>([])
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
      
      // Get recent posts (last 5)
      const sortedPosts = allPosts
        .sort((a: PostData, b: PostData) => {
          const aDate = new Date(a.scheduled_for || a.posted_at || a.created_at)
          const bDate = new Date(b.scheduled_for || b.posted_at || b.created_at)
          return bDate.getTime() - aDate.getTime()
        })
        .slice(0, 5)
      
      setRecentPosts(sortedPosts)
      
      // Calculate upcoming schedule
      const upcomingPosts = scheduled.filter((p: PostData) => 
        ['pending', 'posting'].includes(p.status) && p.scheduled_for
      )
      
      const scheduleMap = new Map()
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      upcomingPosts.forEach((post: PostData) => {
        const postDate = new Date(post.scheduled_for!)
        let dateKey: string
        
        if (postDate.toDateString() === today.toDateString()) {
          dateKey = 'Today'
        } else if (postDate.toDateString() === tomorrow.toDateString()) {
          dateKey = 'Tomorrow'
        } else {
          dateKey = postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
        
        scheduleMap.set(dateKey, (scheduleMap.get(dateKey) || 0) + 1)
      })
      
      const scheduleArray = Array.from(scheduleMap.entries()).map(([date, posts]) => ({ date, posts }))
      setUpcomingSchedule(scheduleArray.slice(0, 4))
      
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
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here&apos;s your social media overview.</p>
          </div>
          <Link href="/dashboard/create/new">
            <Button className="mt-4 sm:mt-0">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
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
              <h1 className="text-3xl font-bold">Dashboard</h1>
              {subscription && (
                <Badge 
                  variant={subscription.hasSubscription ? "default" : "secondary"}
                  className={cn(
                    "font-medium",
                    subscription.hasSubscription && "bg-primary"
                  )}
                >
                  {subscription.hasSubscription ? (
                    <>
                      <Crown className="mr-1 h-3 w-3" />
                      {subscription.planId ? subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1) : 'Free'}
                      {subscription.isTrialing && ' (Trial)'}
                    </>
                  ) : (
                    'Free Plan'
                  )}
                </Badge>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              Welcome back! 
              {subscription?.hasSubscription && subscription?.isTrialing && subscription?.trialEndsAt && (
                <span className="ml-1 text-sm">
                  Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
                </span>
              )}
              {subscription?.hasSubscription && !subscription?.isTrialing && subscription?.currentPeriodEnd && (
                <span className="ml-1 text-sm">
                  Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Link href="/dashboard/create/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          </Link>
          {subscription && !subscription.hasSubscription && (
            <Link href="/#pricing">
              <Button variant="outline">
                <Sparkles className="mr-2 h-4 w-4" />
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Link href="/dashboard/create/new">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </Link>
            <Link href="/dashboard/posts">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                View Posts
              </Button>
            </Link>
            <Link href="/dashboard/calendar">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                Calendar
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Accounts
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {usage && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Posts
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
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


      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Posts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Your latest social media activity</CardDescription>
            </div>
            <Link href="/dashboard/posts">
              <Button variant="ghost" size="sm">
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
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
                  <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Schedule</CardTitle>
              <CardDescription>Posts scheduled for the next few days</CardDescription>
            </div>
            <Link href="/dashboard/calendar">
              <Button variant="ghost" size="sm">
                <Calendar className="mr-1 h-4 w-4" />
                Calendar
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
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
                  <div key={day.date} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <span className="font-medium">{day.date}</span>
                    <span className="text-sm text-gray-600">
                      {day.posts} post{day.posts !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Stats Grid - Activity Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsData.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className={cn(
                    "text-xs mt-1",
                    stat.trend === 'up' ? 'text-green-600' : 'text-gray-600'
                  )}>
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SubscriptionGate>
    </div>
  )
}
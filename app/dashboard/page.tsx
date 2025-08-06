'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Users,
  Clock,
  PlusCircle,
  ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

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

  const fetchDashboardData = async () => {
    try {
      // Fetch all data concurrently
      const [draftsResponse, scheduledResponse] = await Promise.all([
        fetch('/api/drafts'),
        fetch('/api/posts/schedule')
      ])
      
      if (!draftsResponse.ok || !scheduledResponse.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const [draftsData, scheduledData] = await Promise.all([
        draftsResponse.json(),
        scheduledResponse.json()
      ])
      
      const drafts = draftsData.drafts || []
      const scheduled = scheduledData.posts || []
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
            <p className="text-gray-600 mt-1">Welcome back! Here's your social media overview.</p>
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

      {/* Stats Grid */}
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/create/new">
              <Button variant="outline" className="w-full justify-start">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Connect Accounts
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
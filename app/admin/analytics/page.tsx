'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Users,
  CreditCard,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
  Activity,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Link2
} from 'lucide-react'

interface PlatformStats {
  platform: string
  connections: number
}

interface PostStatusStats {
  status: string
  count: number
}

interface AdminStats {
  total_users: number
  active_users: number
  paid_users: number
  total_posts: number
  posts_today: number
  revenue_month: number
  platform_stats: PlatformStats[]
  post_status_stats: PostStatusStats[]
  success_rate: number
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/users?stats=true')
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching admin stats:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const conversionRate = stats?.total_users 
    ? ((stats.paid_users / stats.total_users) * 100).toFixed(1) 
    : 0

  const avgRevenuePerUser = stats?.paid_users 
    ? (stats.revenue_month / stats.paid_users).toFixed(2)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          System-wide analytics and performance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.revenue_month || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Free to paid conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgRevenuePerUser}</div>
            <p className="text-xs text-muted-foreground">
              Average revenue per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_posts && stats?.total_users 
                ? (stats.total_posts / stats.total_users).toFixed(1)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Posts per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>User Metrics</CardTitle>
          <CardDescription>
            User acquisition and retention statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="flex items-center">
              <Users className="h-9 w-9 text-blue-500" />
              <div className="ml-4 space-y-1 flex-1">
                <p className="text-sm font-medium leading-none">
                  Total Users
                </p>
                <p className="text-sm text-muted-foreground">
                  All registered accounts
                </p>
              </div>
              <div className="font-bold text-2xl">{stats?.total_users || 0}</div>
            </div>
            
            <div className="flex items-center">
              <Activity className="h-9 w-9 text-green-500" />
              <div className="ml-4 space-y-1 flex-1">
                <p className="text-sm font-medium leading-none">
                  Active Users
                </p>
                <p className="text-sm text-muted-foreground">
                  Active in last 30 days
                </p>
              </div>
              <div className="font-bold text-2xl">{stats?.active_users || 0}</div>
            </div>

            <div className="flex items-center">
              <CreditCard className="h-9 w-9 text-purple-500" />
              <div className="ml-4 space-y-1 flex-1">
                <p className="text-sm font-medium leading-none">
                  Paid Users
                </p>
                <p className="text-sm text-muted-foreground">
                  Active subscriptions
                </p>
              </div>
              <div className="font-bold text-2xl">{stats?.paid_users || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Content Metrics</CardTitle>
          <CardDescription>
            Platform usage and content creation statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="flex items-center">
              <FileText className="h-9 w-9 text-orange-500" />
              <div className="ml-4 space-y-1 flex-1">
                <p className="text-sm font-medium leading-none">
                  Total Posts
                </p>
                <p className="text-sm text-muted-foreground">
                  All scheduled posts created
                </p>
              </div>
              <div className="font-bold text-2xl">{stats?.total_posts || 0}</div>
            </div>
            
            <div className="flex items-center">
              <Calendar className="h-9 w-9 text-cyan-500" />
              <div className="ml-4 space-y-1 flex-1">
                <p className="text-sm font-medium leading-none">
                  Posts Today
                </p>
                <p className="text-sm text-muted-foreground">
                  Created in last 24 hours
                </p>
              </div>
              <div className="font-bold text-2xl">{stats?.posts_today || 0}</div>
            </div>

            <div className="flex items-center">
              <BarChart3 className="h-9 w-9 text-indigo-500" />
              <div className="ml-4 space-y-1 flex-1">
                <p className="text-sm font-medium leading-none">
                  Daily Average
                </p>
                <p className="text-sm text-muted-foreground">
                  Average posts per day (30 days)
                </p>
              </div>
              <div className="font-bold text-2xl">
                {stats?.total_posts
                  ? (stats.total_posts / 30).toFixed(1)
                  : 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Platform Connections
          </CardTitle>
          <CardDescription>
            Number of connected accounts per platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.platform_stats && stats.platform_stats.length > 0 ? (
            <div className="space-y-4">
              {stats.platform_stats.map((platform) => {
                const maxConnections = Math.max(...stats.platform_stats.map(p => p.connections))
                const percentage = (platform.connections / maxConnections) * 100
                return (
                  <div key={platform.platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{platform.platform}</span>
                      <span className="text-sm text-muted-foreground">{platform.connections} accounts</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No platform connections yet</p>
          )}
        </CardContent>
      </Card>

      {/* Post Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Post Status Breakdown</CardTitle>
            <CardDescription>
              Distribution of posts by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.post_status_stats && stats.post_status_stats.length > 0 ? (
              <div className="space-y-4">
                {stats.post_status_stats.map((statusItem) => {
                  const getStatusIcon = (status: string) => {
                    switch (status) {
                      case 'posted': return <CheckCircle className="h-4 w-4 text-green-500" />
                      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
                      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
                      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />
                      default: return <Clock className="h-4 w-4 text-blue-500" />
                    }
                  }
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'posted': return 'bg-green-500'
                      case 'failed': return 'bg-red-500'
                      case 'pending': return 'bg-yellow-500'
                      case 'cancelled': return 'bg-gray-500'
                      default: return 'bg-blue-500'
                    }
                  }
                  const totalPosts = stats.post_status_stats.reduce((sum, s) => sum + s.count, 0)
                  const percentage = totalPosts > 0 ? (statusItem.count / totalPosts) * 100 : 0

                  return (
                    <div key={statusItem.status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(statusItem.status)}
                          <span className="text-sm font-medium capitalize">{statusItem.status}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {statusItem.count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all ${getStatusColor(statusItem.status)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No posts yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posting Success Rate</CardTitle>
            <CardDescription>
              Percentage of posts that were successfully published
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative h-32 w-32">
              <svg className="h-32 w-32 -rotate-90 transform">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-secondary"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(stats?.success_rate || 0) * 3.52} 352`}
                  className={stats?.success_rate && stats.success_rate >= 90 ? 'text-green-500' : stats?.success_rate && stats.success_rate >= 70 ? 'text-yellow-500' : 'text-red-500'}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{(stats?.success_rate || 0).toFixed(1)}%</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {stats?.success_rate && stats.success_rate >= 90 ? 'Excellent' : stats?.success_rate && stats.success_rate >= 70 ? 'Good' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
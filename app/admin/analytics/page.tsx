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
  BarChart3
} from 'lucide-react'

interface AdminStats {
  total_users: number
  active_users: number
  paid_users: number
  total_posts: number
  posts_today: number
  revenue_month: number
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
    </div>
  )
}
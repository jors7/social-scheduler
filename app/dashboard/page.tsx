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

const stats = [
  {
    title: 'Total Posts',
    value: '156',
    description: '+12% from last month',
    icon: FileText,
    trend: 'up'
  },
  {
    title: 'Scheduled',
    value: '23',
    description: 'Next 7 days',
    icon: Clock,
    trend: 'neutral'
  },
  {
    title: 'Total Reach',
    value: '12.5K',
    description: '+18% from last month',
    icon: Users,
    trend: 'up'
  },
  {
    title: 'Engagement Rate',
    value: '4.8%',
    description: '+0.3% from last month',
    icon: TrendingUp,
    trend: 'up'
  },
]

const recentPosts = [
  {
    id: 1,
    title: 'New product launch announcement',
    platforms: ['twitter', 'facebook', 'linkedin'],
    scheduledFor: '2024-01-20 10:00 AM',
    status: 'scheduled'
  },
  {
    id: 2,
    title: 'Weekly tips and tricks thread',
    platforms: ['twitter', 'instagram'],
    scheduledFor: '2024-01-19 2:00 PM',
    status: 'scheduled'
  },
  {
    id: 3,
    title: 'Customer success story highlight',
    platforms: ['linkedin', 'facebook'],
    postedAt: '2024-01-18 11:30 AM',
    status: 'posted'
  },
]

const upcomingSchedule = [
  {
    date: 'Today',
    posts: 3
  },
  {
    date: 'Tomorrow',
    posts: 2
  },
  {
    date: 'Jan 22',
    posts: 4
  },
  {
    date: 'Jan 23',
    posts: 1
  },
]

export default function DashboardPage() {
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
        {stats.map((stat) => (
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
              {recentPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{post.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        post.status === 'scheduled' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-green-100 text-green-600'
                      )}>
                        {post.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {post.scheduledFor || post.postedAt}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {post.platforms.map((platform) => (
                      <div
                        key={platform}
                        className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs"
                      >
                        {platform[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
              {upcomingSchedule.map((day) => (
                <div key={day.date} className="flex items-center justify-between p-4 border rounded-lg">
                  <span className="font-medium">{day.date}</span>
                  <span className="text-sm text-gray-600">{day.posts} posts</span>
                </div>
              ))}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/create/new">
              <Button variant="outline" className="w-full justify-start">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </Link>
            <Link href="/dashboard/create/multi">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Multi-Post
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
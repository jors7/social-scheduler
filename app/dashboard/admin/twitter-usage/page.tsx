'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Twitter, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Calendar,
  User,
  FileText,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface TwitterUsageData {
  used_today: number
  remaining_today: number
  posts_today: Array<{
    id: string
    user_id: string
    post_id: string
    content_preview: string
    posted_at: string
  }>
}

export default function TwitterUsagePage() {
  const [usage, setUsage] = useState<TwitterUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  const checkAdminAndLoadData = async () => {
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user is in admin_users table
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (!adminUser) {
        toast.error('Access denied: Admin only')
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
      await loadUsageData()
    } catch (error) {
      console.error('Error checking admin status:', error)
      toast.error('Failed to verify admin access')
    }
  }

  const loadUsageData = async () => {
    try {
      setLoading(true)
      
      // Call the database function to get usage stats
      const { data, error } = await supabase
        .rpc('get_twitter_usage_stats')
        .single()

      if (error) throw error

      setUsage(data as TwitterUsageData)
    } catch (error) {
      console.error('Error loading Twitter usage:', error)
      toast.error('Failed to load Twitter usage data')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const usagePercentage = usage ? (usage.used_today / 17) * 100 : 0
  const isNearLimit = usage && usage.used_today >= 14
  const isAtLimit = usage && usage.used_today >= 17

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Twitter API Usage Monitor</h1>
            <p className="text-gray-600 mt-1">Track daily Twitter posting limits (Free Tier: 17 posts/day)</p>
          </div>
          <Button
            onClick={loadUsageData}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Usage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Posts Today</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {usage?.used_today || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-sm text-gray-500 mt-2">
                {usage?.used_today || 0} of 17 posts used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Remaining Today</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {usage?.remaining_today || 17}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {isAtLimit ? (
                  <Badge variant="destructive">Limit Reached</Badge>
                ) : isNearLimit ? (
                  <Badge variant="outline">Near Limit</Badge>
                ) : (
                  <Badge variant="secondary">Available</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Resets at midnight
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Status</CardDescription>
              <CardTitle className="text-xl">
                {isAtLimit ? 'Unavailable' : 'Active'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {isAtLimit ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className="text-sm">
                  {isAtLimit 
                    ? 'Twitter posting disabled until tomorrow'
                    : `${usage?.remaining_today || 17} posts available`
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {isNearLimit && !isAtLimit && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Warning:</strong> Approaching daily Twitter API limit. Only {usage?.remaining_today} posts remaining today.
            </AlertDescription>
          </Alert>
        )}

        {isAtLimit && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Limit Reached:</strong> Daily Twitter API limit has been reached. Posting will be available again tomorrow.
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Twitter Posts</CardTitle>
            <CardDescription>
              All posts made through the app today ({format(new Date(), 'MMMM d, yyyy')})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usage?.posts_today && usage.posts_today.length > 0 ? (
              <div className="space-y-3">
                {usage.posts_today.map((post, index) => (
                  <div 
                    key={post.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {format(new Date(post.posted_at), 'h:mm a')}
                        </span>
                        <span className="text-gray-300">•</span>
                        <FileText className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          Post ID: {post.post_id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {post.content_preview}
                      </p>
                    </div>
                    <a
                      href={`https://twitter.com/i/web/status/${post.post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Twitter className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No Twitter posts today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Free tier allows 17 posts per day across all users</p>
              <p>• Daily limit resets at midnight (UTC)</p>
              <p>• Consider upgrading to Basic tier ($100/month) for 10,000 posts/month</p>
              <p>• Users won&apos;t see limit warnings - they&apos;ll see &quot;temporarily unavailable&quot;</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
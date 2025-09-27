'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Clock, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SimpleDragCalendar } from '@/components/dashboard/simple-drag-calendar'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  media_urls: string[]
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled'
  created_at: string
  pinterest_title?: string
  pinterest_description?: string
}

export default function CalendarPage() {
  const router = useRouter()
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch('/api/posts/schedule')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const data = await response.json()
      const posts = data.posts || []
      
      // Filter to only show pending posts
      const pendingPosts = posts.filter((post: ScheduledPost) => post.status === 'pending')
      setScheduledPosts(pendingPosts)
    } catch (error) {
      console.error('Error fetching scheduled posts:', error)
      toast.error('Failed to load scheduled posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScheduledPosts()
  }, [])

  const handlePostUpdate = async (postId: string, newDate: Date) => {
    try {
      const response = await fetch(`/api/posts/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId,
          scheduledFor: newDate.toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('Server error response:', errorData)
        console.error('Full error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        throw new Error(errorData?.error || 'Failed to update post')
      }

      // Refresh posts
      fetchScheduledPosts()
    } catch (error) {
      console.error('Error updating post:', error)
      throw error
    }
  }

  const handleEditPost = (postId: string) => {
    router.push(`/dashboard/create/new?scheduledPostId=${postId}`)
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return
    }

    try {
      const response = await fetch(`/api/posts/schedule?id=${postId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      toast.success('Post deleted successfully')
      fetchScheduledPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post')
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
                <Calendar className="h-8 w-8" />
              </div>
              Calendar
            </h1>
            <p className="text-gray-600 mt-2 text-lg">View and manage your scheduled posts</p>
          </div>
        </div>
        <Card variant="elevated">
          <CardContent className="text-center py-16 bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-fit mx-auto mb-6">
              <Clock className="h-12 w-12 text-white animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading calendar...</h3>
            <p className="text-gray-600">Please wait while we fetch your scheduled posts</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <Calendar className="h-8 w-8" />
            </div>
            Calendar
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Drag and drop posts to reschedule them instantly</p>
        </div>
        <Link href="/dashboard/create/new">
          <Button variant="gradient" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Post
          </Button>
        </Link>
      </div>

      <SubscriptionGate feature="calendar scheduling">
        <Card variant="glass" className="p-6 min-h-[600px]">
          <SimpleDragCalendar
            scheduledPosts={scheduledPosts}
            onPostUpdate={handlePostUpdate}
            onPostEdit={handleEditPost}
            onPostDelete={handleDeletePost}
          />
        </Card>
      </SubscriptionGate>
    </div>
  )
}
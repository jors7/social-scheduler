'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Clock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DragDropCalendar } from '@/components/dashboard/drag-drop-calendar'

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  media_urls: string[]
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled'
  created_at: string
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
        throw new Error('Failed to update post')
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
      const response = await fetch(`/api/posts/schedule`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: postId })
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
      <div className="flex-1 space-y-8 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-gray-600 mt-1">View and manage your scheduled posts</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Clock className="h-8 w-8 text-gray-400 animate-spin mr-2" />
          <p className="text-gray-500">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-gray-600 mt-1">Drag and drop posts to reschedule them instantly</p>
        </div>
        <Link href="/dashboard/create/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </Link>
      </div>

      <DragDropCalendar
        scheduledPosts={scheduledPosts}
        onPostUpdate={handlePostUpdate}
        onPostEdit={handleEditPost}
        onPostDelete={handleDeletePost}
      />
    </div>
  )
}
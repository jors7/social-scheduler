'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Calendar } from 'lucide-react'
import { PostCard } from '@/components/post-card'

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  media_urls: string[]
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled'
  created_at: string
  post_results?: any[]
}

interface ScheduledPostsListProps {
  posts: ScheduledPost[]
  selectedPosts: string[]
  onTogglePostSelection: (postId: string) => void
  onToggleAllPosts: () => void
  onPostNow?: (postId: string) => void
  onPausePost?: (postId: string) => void
  onResumePost?: (postId: string) => void
  onEditPost?: (postId: string) => void
  loading: boolean
}

export function ScheduledPostsList({ 
  posts, 
  selectedPosts, 
  onTogglePostSelection, 
  onToggleAllPosts,
  onPostNow,
  onPausePost,
  onResumePost,
  onEditPost,
  loading 
}: ScheduledPostsListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
          <p className="text-gray-500">Loading scheduled posts...</p>
        </CardContent>
      </Card>
    )
  }

  if (posts.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="text-center py-16">
          <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-6">
            <Clock className="h-12 w-12 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No scheduled posts found</h3>
          <p className="text-gray-600 mb-6">Schedule your first post to see it here</p>
          <Button 
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg" 
            onClick={() => window.location.href = '/dashboard/create/new'}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Schedule a Post
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Select all checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selectedPosts.length === posts.length && posts.length > 0}
          onChange={onToggleAllPosts}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-600">Select all ({posts.length} posts)</span>
      </div>
      
      {/* Grid of posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            variant="scheduled"
            selected={selectedPosts.includes(post.id)}
            onToggleSelection={() => onTogglePostSelection(post.id)}
            onEdit={() => onEditPost?.(post.id)}
            onPostNow={() => onPostNow?.(post.id)}
            onPause={() => onPausePost?.(post.id)}
            onResume={() => onResumePost?.(post.id)}
          />
        ))}
      </div>
    </div>
  )
}
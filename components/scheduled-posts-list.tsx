'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  Calendar,
  Play,
  Pause,
  Eye,
  Send,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface ScheduledPostsListProps {
  posts: ScheduledPost[]
  selectedPosts: string[]
  onTogglePostSelection: (postId: string) => void
  onToggleAllPosts: () => void
  onPostNow?: (postId: string) => void
  onPausePost?: (postId: string) => void
  onResumePost?: (postId: string) => void
  loading: boolean
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-blue-100 text-blue-700'
    case 'cancelled': return 'bg-orange-100 text-orange-700'
    case 'failed': return 'bg-red-100 text-red-700'
    case 'posting': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return Clock
    case 'cancelled': return Pause
    case 'failed': return X
    case 'posting': return Send
    default: return Clock
  }
}

const formatTimeUntil = (scheduledFor: string) => {
  const now = new Date()
  const scheduled = new Date(scheduledFor)
  const diffMs = scheduled.getTime() - now.getTime()
  
  if (diffMs <= 0) return 'Overdue'
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} min`
  return `${minutes} min`
}

const formatScheduledDate = (scheduledFor: string) => {
  return new Date(scheduledFor).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const getUrgencyColor = (timeUntil: string) => {
  if (timeUntil === 'Overdue') return 'text-red-600 font-medium'
  if (timeUntil.includes('hour') && !timeUntil.includes('day')) {
    return 'text-red-600 font-medium'
  } else if (timeUntil.includes('1 day')) {
    return 'text-orange-600 font-medium'
  }
  return 'text-gray-600'
}

const stripHtml = (html: string) => {
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export function ScheduledPostsList({ 
  posts, 
  selectedPosts, 
  onTogglePostSelection, 
  onToggleAllPosts,
  onPostNow,
  onPausePost,
  onResumePost,
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
      <Card>
        <CardContent className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 mb-2">No scheduled posts found</p>
          <p className="text-sm text-gray-400">Schedule your first post to see it here</p>
          <Button className="mt-4" onClick={() => window.location.href = '/dashboard/create/new'}>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule a Post
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4">
        <input
          type="checkbox"
          checked={selectedPosts.length === posts.length}
          onChange={onToggleAllPosts}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-600">Select all</span>
      </div>
      
      {posts.map(post => {
        const StatusIcon = getStatusIcon(post.status)
        const timeUntil = formatTimeUntil(post.scheduled_for)
        
        return (
          <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-start p-4 gap-4">
                <input
                  type="checkbox"
                  checked={selectedPosts.includes(post.id)}
                  onChange={() => onTogglePostSelection(post.id)}
                  className="mt-1 rounded border-gray-300"
                />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {stripHtml(post.content).slice(0, 60)}...
                        </h3>
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          getStatusColor(post.status)
                        )}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">{stripHtml(post.content)}</p>
                      
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {formatScheduledDate(post.scheduled_for)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className={cn(
                            "text-sm",
                            getUrgencyColor(timeUntil)
                          )}>
                            {timeUntil === 'Overdue' ? timeUntil : `in ${timeUntil}`}
                          </span>
                        </div>
                        
                        <div className="flex gap-1">
                          {post.platforms.map(platform => (
                            <span
                              key={platform}
                              className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs"
                              title={platform}
                            >
                              {platformIcons[platform] || platform[0].toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs">
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Eye className="mr-1 h-3 w-3" />
                          Preview
                        </Button>
                        {post.status === 'pending' ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs"
                            onClick={() => onPausePost?.(post.id)}
                          >
                            <Pause className="mr-1 h-3 w-3" />
                            Pause
                          </Button>
                        ) : post.status === 'cancelled' ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs"
                            onClick={() => onResumePost?.(post.id)}
                          >
                            <Play className="mr-1 h-3 w-3" />
                            Resume
                          </Button>
                        ) : null}
                        {(post.status === 'pending' || post.status === 'cancelled') && (
                          <Button 
                            size="sm" 
                            className="text-xs"
                            onClick={() => onPostNow?.(post.id)}
                          >
                            <Send className="mr-1 h-3 w-3" />
                            Post Now
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
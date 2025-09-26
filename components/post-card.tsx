'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Edit,
  Clock,
  Calendar,
  Play,
  Pause,
  Eye,
  Send,
  FileEdit,
  Trash2,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PostVariant = 'posted' | 'scheduled' | 'draft'

interface BasePost {
  id: string
  content: string
  platforms: string[]
  media_urls?: string[]
  created_at: string
}

interface PostedPost extends BasePost {
  posted_at?: string
  platform_media_url?: string
  pinterest_title?: string
  pinterest_description?: string
}

interface ScheduledPost extends BasePost {
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled'
}

interface DraftPost extends BasePost {
  title?: string
  updated_at?: string
}

type Post = PostedPost | ScheduledPost | DraftPost

interface PostCardProps {
  post: Post
  variant: PostVariant
  selected?: boolean
  onToggleSelection?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPostNow?: () => void
  onPause?: () => void
  onResume?: () => void
  onLoadDraft?: () => void
}

const platformColors: Record<string, string> = {
  twitter: 'bg-black text-white',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  facebook: 'bg-blue-600 text-white',
  linkedin: 'bg-blue-700 text-white',
  youtube: 'bg-red-600 text-white',
  tiktok: 'bg-black text-white',
  threads: 'bg-black text-white',
  bluesky: 'bg-blue-500 text-white',
  pinterest: 'bg-red-600 text-white',
}

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
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const formatScheduledDate = (scheduledFor: string) => {
  const now = new Date()
  const scheduled = new Date(scheduledFor)
  const diffMs = scheduled.getTime() - now.getTime()
  
  if (diffMs <= 0) return 'Overdue'
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `in ${days}d ${hours % 24}h`
  return `in ${hours}h`
}

export function PostCard({ 
  post, 
  variant,
  selected = false,
  onToggleSelection,
  onEdit,
  onDelete,
  onPostNow,
  onPause,
  onResume,
  onLoadDraft
}: PostCardProps) {
  // Get the appropriate image URL based on variant
  const getImageUrl = () => {
    if (variant === 'posted') {
      const postedPost = post as PostedPost
      return postedPost.platform_media_url || postedPost.media_urls?.[0]
    }
    // For scheduled and draft posts, handle media_urls properly
    const mediaUrls = post.media_urls
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      // Filter out any null/undefined values
      const validUrl = mediaUrls.find(url => url && typeof url === 'string')
      return validUrl || null
    }
    return null
  }

  // Get the appropriate title/content for display
  const getDisplayContent = () => {
    if (variant === 'posted' && 'pinterest_title' in post) {
      const postedPost = post as PostedPost
      if (postedPost.pinterest_title) {
        return postedPost.pinterest_title
      }
    }
    if (variant === 'draft' && 'title' in post) {
      const draftPost = post as DraftPost
      if (draftPost.title) {
        return draftPost.title
      }
    }
    return stripHtml(post.content)
  }

  // Get status for scheduled posts
  const getStatus = () => {
    if (variant === 'scheduled') {
      const scheduledPost = post as ScheduledPost
      return scheduledPost.status
    }
    return null
  }

  const imageUrl = getImageUrl()
  const displayContent = getDisplayContent()
  const status = getStatus()
  const timeUntil = variant === 'scheduled' ? formatScheduledDate((post as ScheduledPost).scheduled_for) : ''
  const isOverdue = timeUntil === 'Overdue'

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group h-full flex flex-col">
      {/* Always show thumbnail area for consistency */}
      <div className="relative aspect-video bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Post thumbnail"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              // Hide broken image and show placeholder instead
              e.currentTarget.style.display = 'none'
              const placeholder = e.currentTarget.nextElementSibling
              if (placeholder) {
                (placeholder as HTMLElement).style.display = 'flex'
              }
            }}
          />
        ) : null}
        <div 
          className="w-full h-full flex items-center justify-center bg-gray-50"
          style={{ display: imageUrl ? 'none' : 'flex' }}
        >
          <FileText className="h-12 w-12 text-gray-300" />
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Checkbox and Content */}
        <div className="flex items-start gap-3 mb-3">
          {onToggleSelection && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelection}
              className="mt-0.5 rounded border-gray-300"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 line-clamp-2 font-medium text-sm">
              {displayContent}
            </p>
          </div>
        </div>

        {/* Platform badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {post.platforms.map(platform => (
            <span
              key={platform}
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded",
                platformColors[platform] || 'bg-gray-200 text-gray-700'
              )}
            >
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </span>
          ))}
        </div>

        {/* Date, time and status info - push to bottom */}
        <div className="mt-auto">
          {variant === 'posted' && 'posted_at' in post && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Posted
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(post.posted_at || post.created_at)}
              </span>
            </div>
          )}
          
          {variant === 'scheduled' && 'scheduled_for' in post && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs font-medium",
                  isOverdue ? 'text-red-600' : 'text-gray-600'
                )}>
                  {timeUntil}
                </span>
                {status && status !== 'pending' && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-medium",
                    status === 'cancelled' ? 'bg-orange-100 text-orange-700' :
                    status === 'failed' ? 'bg-red-100 text-red-700' :
                    status === 'posting' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {status}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {formatDateTime((post as ScheduledPost).scheduled_for)}
              </div>
            </div>
          )}
          
          {variant === 'draft' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {('updated_at' in post && post.updated_at) ? 'Updated' : 'Created'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(('updated_at' in post && post.updated_at) ? post.updated_at : post.created_at)}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {variant === 'posted' && (
              <>
                <Button size="sm" variant="ghost" className="h-7 px-2 flex-1">
                  <Eye className="h-3 w-3" />
                  <span className="ml-1 text-xs">View</span>
                </Button>
              </>
            )}

            {variant === 'scheduled' && (
              <>
                {onEdit && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit}>
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                {status === 'pending' && onPause && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onPause}>
                    <Pause className="h-3 w-3" />
                  </Button>
                )}
                {status === 'cancelled' && onResume && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onResume}>
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                {(status === 'pending' || status === 'cancelled') && onPostNow && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 flex-1" onClick={onPostNow}>
                    <Send className="h-3 w-3" />
                    <span className="ml-1 text-xs">Post Now</span>
                  </Button>
                )}
              </>
            )}

            {variant === 'draft' && (
              <>
                {onLoadDraft && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 flex-1" onClick={onLoadDraft}>
                    <FileEdit className="h-3 w-3" />
                    <span className="ml-1 text-xs">Edit</span>
                  </Button>
                )}
                {onDelete && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={onDelete}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
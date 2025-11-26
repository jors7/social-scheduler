'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AccountBadge } from '@/components/ui/account-badge'
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
import { getMediaUrl, getMediaThumbnail, isVideoUrl } from '@/lib/utils/media'

type PostVariant = 'posted' | 'scheduled' | 'draft'

interface AccountInfo {
  id: string
  username: string
  label?: string | null
}

interface BasePost {
  id: string
  content: string
  platforms: string[]
  media_urls?: string[]
  created_at: string
  account_info?: Record<string, AccountInfo[]>
}

interface PostedPost extends BasePost {
  posted_at?: string
  platform_media_url?: string
  pinterest_title?: string
  pinterest_description?: string
  // Format flags
  instagram_as_story?: boolean
  instagram_as_reel?: boolean
  facebook_as_story?: boolean
  facebook_as_reel?: boolean
  youtube_as_short?: boolean
}

interface ScheduledPost extends BasePost {
  scheduled_for: string
  status: 'pending' | 'posting' | 'posted' | 'failed' | 'cancelled' | 'processing'
  platform_media_url?: string
  pinterest_title?: string
  pinterest_description?: string
  // Format flags
  instagram_as_story?: boolean
  instagram_as_reel?: boolean
  facebook_as_story?: boolean
  facebook_as_reel?: boolean
  youtube_as_short?: boolean
  // Thread-specific fields
  threads_mode?: string
  threads_thread_media?: any[][]
  // Async job tracking
  processing_state?: any
}

interface DraftPost extends BasePost {
  title?: string
  updated_at?: string
  pinterest_title?: string
  pinterest_description?: string
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
      // If platform_media_url exists, use it
      if (postedPost.platform_media_url) return postedPost.platform_media_url
      // Otherwise extract URL from media_urls (handles both string and object formats)
      return getMediaUrl(postedPost.media_urls?.[0])
    }

    // For scheduled posts, check platform_media_url first (same as posted)
    if (variant === 'scheduled') {
      const scheduledPost = post as ScheduledPost
      // If platform_media_url exists, use it
      if (scheduledPost.platform_media_url) return scheduledPost.platform_media_url

      // Check Threads thread media
      if (scheduledPost.threads_mode === 'thread' &&
          scheduledPost.threads_thread_media &&
          Array.isArray(scheduledPost.threads_thread_media) &&
          scheduledPost.threads_thread_media.length > 0) {
        const firstPostMedia = scheduledPost.threads_thread_media[0]
        if (Array.isArray(firstPostMedia) && firstPostMedia.length > 0) {
          // Extract URL from first thread post's first media item
          return getMediaUrl(firstPostMedia[0])
        }
      }
    }

    // For scheduled and draft posts, handle media_urls properly
    const mediaUrls = post.media_urls
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      // Extract URL from first media item (handles both formats)
      return getMediaUrl(mediaUrls[0])
    }
    return null
  }

  // Get video thumbnail if available (new format only)
  const getVideoThumbnailUrl = () => {
    // For scheduled posts, check Threads thread media first
    if (variant === 'scheduled') {
      const scheduledPost = post as ScheduledPost
      if (scheduledPost.threads_mode === 'thread' &&
          scheduledPost.threads_thread_media &&
          Array.isArray(scheduledPost.threads_thread_media) &&
          scheduledPost.threads_thread_media.length > 0) {
        const firstPostMedia = scheduledPost.threads_thread_media[0]
        if (Array.isArray(firstPostMedia) && firstPostMedia.length > 0) {
          // Extract thumbnail from first thread post's first media item
          return getMediaThumbnail(firstPostMedia[0])
        }
      }
    }

    const mediaUrls = post.media_urls
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      return getMediaThumbnail(mediaUrls[0])
    }
    return null
  }

  // Get the appropriate title/content for display
  const getDisplayContent = () => {
    // Check for format-specific labels first (for stories/reels/shorts without captions)
    const postWithFlags = post as any

    // Check for Facebook Story
    if (Array.isArray(post.platforms) && post.platforms.includes('facebook') && postWithFlags.facebook_as_story) {
      const content = stripHtml(post.content)
      return content && content.trim() ? content : 'Facebook Story'
    }

    // Check for Facebook Reel
    if (Array.isArray(post.platforms) && post.platforms.includes('facebook') && postWithFlags.facebook_as_reel) {
      const content = stripHtml(post.content)
      return content && content.trim() ? content : 'Facebook Reel'
    }

    // Check for Instagram Story
    if (Array.isArray(post.platforms) && post.platforms.includes('instagram') && postWithFlags.instagram_as_story) {
      const content = stripHtml(post.content)
      return content && content.trim() ? content : 'Instagram Story'
    }

    // Check for Instagram Reel
    if (Array.isArray(post.platforms) && post.platforms.includes('instagram') && postWithFlags.instagram_as_reel) {
      const content = stripHtml(post.content)
      return content && content.trim() ? content : 'Instagram Reel'
    }

    // Check for YouTube Short
    if (Array.isArray(post.platforms) && post.platforms.includes('youtube') && postWithFlags.youtube_as_short) {
      const content = stripHtml(post.content)
      return content && content.trim() ? content : 'YouTube Short'
    }

    // Check for Pinterest title (works for all variants)
    if (Array.isArray(post.platforms) && post.platforms.includes('pinterest') && 'pinterest_title' in post) {
      const pinterestPost = post as any
      if (pinterestPost.pinterest_title) {
        return pinterestPost.pinterest_title
      }
    }

    // Then check for draft title
    if (variant === 'draft' && 'title' in post) {
      const draftPost = post as DraftPost
      if (draftPost.title && draftPost.title !== 'Untitled Draft') {
        return draftPost.title
      }
    }

    // For Pinterest posts, try to show something meaningful
    if (Array.isArray(post.platforms) && post.platforms.includes('pinterest')) {
      // Try pinterest_description if available
      const pinterestPost = post as any
      if (pinterestPost.pinterest_description) {
        return pinterestPost.pinterest_description
      }
      // If content is empty or very short, show a default
      const content = stripHtml(post.content)
      if (!content || content.trim() === '') {
        return 'Pinterest Pin'
      }
      return content
    }

    // Default to content or fallback text
    const content = stripHtml(post.content)
    return content || 'No content'
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
  const videoThumbnail = getVideoThumbnailUrl()
  const displayContent = getDisplayContent()
  const status = getStatus()
  const timeUntil = variant === 'scheduled' ? formatScheduledDate((post as ScheduledPost).scheduled_for) : ''
  const isOverdue = timeUntil === 'Overdue'

  // Check if the media URL is a video
  // Note: Pinterest video pins have image thumbnails, not video files
  const isVideo = imageUrl &&
    !(Array.isArray(post.platforms) && post.platforms.includes('pinterest')) && // Don't treat Pinterest thumbnails as videos
    isVideoUrl(imageUrl)

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group h-full flex flex-col">
      {/* Always show thumbnail area for consistency */}
      <div className="relative aspect-video bg-gray-100">
        {imageUrl ? (
          isVideo ? (
            videoThumbnail ? (
              <div className="relative w-full h-full">
                <img
                  src={videoThumbnail}
                  alt="Video thumbnail"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    // Hide broken thumbnail and show placeholder instead
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 rounded-full p-3">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              </div>
            ) : (
              <video
                src={imageUrl}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                preload="metadata"
                onError={(e) => {
                  // Hide broken video and show placeholder instead
                  e.currentTarget.style.display = 'none'
                  const placeholder = e.currentTarget.nextElementSibling
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = 'flex'
                  }
                }}
              />
            )
          ) : (
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
          )
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

        {/* Platform badges with account info */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(Array.isArray(post.platforms) ? post.platforms : []).map(platform => (
            <AccountBadge
              key={platform}
              platform={platform}
              accounts={post.account_info?.[platform]}
              variant="solid"
            />
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
                    status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {status === 'processing' ? 'Processing...' : status}
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
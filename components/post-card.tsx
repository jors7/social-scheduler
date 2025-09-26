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
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

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
    return post.media_urls?.[0]
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

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      <CardContent className="p-0">
        {/* Thumbnail */}
        {imageUrl && (
          <div className="relative aspect-video bg-gray-100">
            <Image
              src={imageUrl}
              alt="Post thumbnail"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <div className="p-4">
          {/* Selection checkbox */}
          {onToggleSelection && (
            <div className="flex items-start gap-3 mb-3">
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelection}
                className="mt-1 rounded border-gray-300"
              />
              <div className="flex-1 min-w-0">
                {/* Content */}
                <p className="text-gray-900 line-clamp-2 font-medium">
                  {displayContent}
                </p>
              </div>
            </div>
          )}

          {!onToggleSelection && (
            <p className="text-gray-900 line-clamp-2 font-medium mb-3">
              {displayContent}
            </p>
          )}

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

          {/* Date and status info */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            {variant === 'posted' && 'posted_at' in post && (
              <span>{formatDate(post.posted_at || post.created_at)}</span>
            )}
            
            {variant === 'scheduled' && 'scheduled_for' in post && (
              <div className="flex items-center gap-2">
                <span>{formatScheduledDate((post as ScheduledPost).scheduled_for)}</span>
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
            )}
            
            {variant === 'draft' && (
              <span>
                {('updated_at' in post && post.updated_at) 
                  ? `Updated ${formatDate(post.updated_at)}`
                  : `Created ${formatDate(post.created_at)}`
                }
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {variant === 'posted' && (
              <>
                <Button size="sm" variant="ghost" className="h-7 px-2">
                  <Eye className="h-3 w-3" />
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
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onPostNow}>
                    <Send className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}

            {variant === 'draft' && (
              <>
                {onLoadDraft && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onLoadDraft}>
                    <FileEdit className="h-3 w-3" />
                  </Button>
                )}
                {onEdit && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit}>
                    <Edit className="h-3 w-3" />
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
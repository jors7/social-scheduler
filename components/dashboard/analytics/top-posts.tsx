'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, Share, Eye, FileText, Image, Video } from 'lucide-react'
import Link from 'next/link'

interface AnalyticsData {
  totalPosts: number
  totalEngagement: number
  totalReach: number
  totalImpressions: number
  engagementRate: number
  topPlatform: string
  allPosts: any[]
  platformStats: Record<string, any>
}

interface TopPostsProps {
  analyticsData: AnalyticsData | null
}

export function TopPosts({ analyticsData }: TopPostsProps) {
  if (!analyticsData) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-3 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }
  
  const stripHtml = (html: string | undefined | null) => {
    if (!html) return ''
    return String(html)
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }
  
  // Calculate top posts based on engagement
  const topPosts = analyticsData.allPosts
    .map(post => {
      // Handle different data structures from various platform APIs
      let totalEngagement = 0
      let totalReach = 0
      let content = ''
      let posted_at = ''
      let hasMedia = false
      const platforms: string[] = []
      
      // Add platform to list
      if (post.platform) {
        platforms.push(post.platform)
      }
      
      // Facebook posts
      if (post.platform === 'facebook') {
        content = post.message || ''
        totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0) + (post.reactions || 0)
        totalReach = post.reach || post.impressions || 0
        posted_at = post.created_time || post.timestamp || ''
        hasMedia = post.type === 'photo' || post.type === 'video'
      }
      // Instagram posts
      else if (post.platform === 'instagram') {
        content = post.caption || ''
        totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.saves || 0)
        totalReach = post.reach || 0
        posted_at = post.timestamp || ''
        hasMedia = post.media_type === 'IMAGE' || post.media_type === 'VIDEO' || post.media_type === 'CAROUSEL_ALBUM'
      }
      // Threads posts
      else if (post.platform === 'threads') {
        content = post.text || ''
        totalEngagement = (post.likes || 0) + (post.replies || 0) + (post.reposts || 0) + (post.quotes || 0)
        totalReach = post.views || 0
        posted_at = post.timestamp || ''
        hasMedia = post.media_type === 'IMAGE' || post.media_type === 'VIDEO'
      }
      // Bluesky posts
      else if (post.platform === 'bluesky') {
        content = post.text || ''
        totalEngagement = (post.likes || 0) + (post.reposts || 0) + (post.replies || 0) + (post.quotes || 0)
        totalReach = post.likes + post.reposts // Bluesky doesn't provide view counts
        posted_at = post.createdAt || ''
        hasMedia = false // Would need to check post.embed for media
      }
      
      return {
        id: post.id,
        content: stripHtml(content),
        platforms: platforms,
        engagement: totalEngagement,
        reach: totalReach,
        posted_at: posted_at,
        hasMedia: hasMedia
      }
    })
    .sort((a, b) => {
      // Sort by engagement first, then by date for posts with no engagement
      if (b.engagement !== a.engagement) {
        return b.engagement - a.engagement
      }
      return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
    })
    .slice(0, 5)
    
  if (topPosts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6 sm:py-8 text-gray-500">
          <Eye className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-300 mb-3 sm:mb-4" />
          <p className="text-xs sm:text-sm mb-2">No top posts yet</p>
          <p className="text-[10px] sm:text-xs text-gray-400">Publish posts to see your best performers</p>
          <Link href="/dashboard/create/new" className="inline-block mt-2 sm:mt-3">
            <button className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700">Create your first post →</button>
          </Link>
        </div>
      </div>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        // eslint-disable-next-line jsx-a11y/alt-text
        return <Image className="h-3 w-3" />
      case 'video':
        return <Video className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      'instagram': '📷',
      'twitter': '🐦',
      'facebook': '👥',
      'linkedin': '💼',
      'tiktok': '🎵',
      'youtube': '📹',
      'bluesky': '🦋',
      'threads': '🧵',
      'pinterest': '📌'
    }
    return emojis[platform.toLowerCase()] || '📱'
  }
  
  const getPlatformColors = (platform: string) => {
    const colors: Record<string, string> = {
      'instagram': '#E4405F',
      'twitter': '#1DA1F2',
      'facebook': '#1877F2',
      'linkedin': '#0077B5',
      'tiktok': '#000000',
      'youtube': '#FF0000',
      'bluesky': '#00A8E8',
      'threads': '#000000',
      'pinterest': '#BD081C'
    }
    return colors[platform.toLowerCase()] || '#6B7280'
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      {topPosts.map((post, index) => (
        <Card key={post.id} className="p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1 flex-wrap gap-1">
                {post.platforms.map((platform: string, idx: number) => (
                  <Badge 
                    key={idx}
                    variant="secondary" 
                    className="text-xs"
                    style={{ 
                      backgroundColor: `${getPlatformColors(platform)}20`,
                      color: getPlatformColors(platform)
                    }}
                  >
                    <span className="mr-1">{getPlatformEmoji(platform)}</span>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Badge>
                ))}
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  {post.hasMedia ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  <span>{formatDate(post.posted_at)}</span>
                </div>
              </div>
              
              <p className="text-sm text-foreground mb-2 line-clamp-2">
                {post.content.length > 80 ? `${post.content.slice(0, 80)}...` : post.content}
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Heart className="h-3 w-3" />
                  <span>{post.engagement.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{post.reach.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
      
      <div className="text-center pt-2">
        <Link href="/dashboard/posts/posted">
          <button className="text-xs text-muted-foreground hover:text-foreground">
            View all posts →
          </button>
        </Link>
      </div>
    </div>
  )
}
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTopPosts, getPlatformColors } from '@/lib/mock-analytics'
import { Heart, MessageCircle, Share, Eye, FileText, Image, Video } from 'lucide-react'

export function TopPosts() {
  const posts = getTopPosts()

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-3 w-3" />
      case 'video':
        return <Video className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      'Instagram': '📷',
      'Twitter': '🐦',
      'Facebook': '👥',
      'LinkedIn': '💼',
      'TikTok': '🎵',
      'YouTube': '📹'
    }
    return emojis[platform] || '📱'
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <Card key={post.id} className="p-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm">
                {index + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: `${getPlatformColors(post.platform)}20`,
                    color: getPlatformColors(post.platform)
                  }}
                >
                  <span className="mr-1">{getPlatformEmoji(post.platform)}</span>
                  {post.platform}
                </Badge>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  {getTypeIcon(post.type)}
                  <span>{post.date}</span>
                </div>
              </div>
              
              <p className="text-sm text-foreground mb-2 line-clamp-2">
                {post.content}
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
        <button className="text-xs text-muted-foreground hover:text-foreground">
          View all posts →
        </button>
      </div>
    </div>
  )
}
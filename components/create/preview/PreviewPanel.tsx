'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { TwitterPreview } from './TwitterPreview'
import { InstagramPreview } from './InstagramPreview'
import { FacebookPreview } from './FacebookPreview'
import { LinkedInPreview } from './LinkedInPreview'
import { ThreadsPreview } from './ThreadsPreview'
import { BlueskyPreview } from './BlueskyPreview'
import { PinterestPreview } from './PinterestPreview'
import { TikTokPreview } from './TikTokPreview'
import { YouTubePreview } from './YouTubePreview'

interface PreviewPanelProps {
  selectedPlatforms: string[]
  content: string
  platformContent: Record<string, string>
  mediaUrls: string[]
  instagramFormat?: 'feed-square' | 'feed-portrait' | 'feed-landscape' | 'story' | 'reel'
  facebookFormat?: 'feed' | 'story' | 'reel'
  onClose: () => void
}

const platformConfig = {
  twitter: { name: 'X (Twitter)', icon: '𝕏', component: TwitterPreview },
  instagram: { name: 'Instagram', icon: '📷', component: InstagramPreview },
  facebook: { name: 'Facebook', icon: 'f', component: FacebookPreview },
  linkedin: { name: 'LinkedIn', icon: 'in', component: LinkedInPreview },
  threads: { name: 'Threads', icon: '@', component: ThreadsPreview },
  bluesky: { name: 'Bluesky', icon: '🦋', component: BlueskyPreview },
  pinterest: { name: 'Pinterest', icon: 'P', component: PinterestPreview },
  tiktok: { name: 'TikTok', icon: '♪', component: TikTokPreview },
  youtube: { name: 'YouTube', icon: '▶', component: YouTubePreview },
}

export function PreviewPanel({
  selectedPlatforms,
  content,
  platformContent,
  mediaUrls,
  instagramFormat = 'feed-portrait',
  facebookFormat = 'feed',
  onClose
}: PreviewPanelProps) {
  const [activePlatform, setActivePlatform] = useState(
    selectedPlatforms[0] || 'twitter'
  )

  if (selectedPlatforms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Preview</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Select a platform to see preview</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const ActivePreviewComponent =
    platformConfig[activePlatform as keyof typeof platformConfig]?.component ||
    TwitterPreview

  const platformContentToUse = platformContent[activePlatform] || content

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-lg">Preview</CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Platform tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {selectedPlatforms.map((platformId) => {
            const platform =
              platformConfig[platformId as keyof typeof platformConfig]
            if (!platform) return null

            return (
              <button
                key={platformId}
                onClick={() => setActivePlatform(platformId)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  activePlatform === platformId
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span className="text-base">{platform.icon}</span>
                <span className="hidden sm:inline">{platform.name}</span>
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px] max-h-[600px] overflow-y-auto">
          <ActivePreviewComponent
            content={platformContentToUse}
            mediaUrls={mediaUrls}
            {...(activePlatform === 'instagram' && { format: instagramFormat })}
            {...(activePlatform === 'facebook' && { format: facebookFormat })}
          />
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-500 mt-3 text-center">
          Preview shows how your post will appear. Actual appearance may vary.
        </p>
      </CardContent>
    </Card>
  )
}

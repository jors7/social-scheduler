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
  mediaUrls: (string | { url: string; thumbnailUrl?: string; type?: string })[]
  instagramFormat?: 'feed-square' | 'feed-portrait' | 'feed-landscape' | 'story' | 'reel'
  facebookFormat?: 'feed' | 'story' | 'reel'
  youtubeFormat?: 'video' | 'short'
  youtubeTitle?: string
  youtubeDescription?: string
  youtubeMediaUrls?: string[]
  pinterestTitle?: string
  pinterestDescription?: string
  pinterestBoard?: string
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
  mediaUrls: rawMediaUrls,
  instagramFormat = 'feed-portrait',
  facebookFormat = 'feed',
  youtubeFormat = 'video',
  youtubeTitle,
  youtubeDescription,
  youtubeMediaUrls,
  pinterestTitle,
  pinterestDescription,
  pinterestBoard,
  onClose
}: PreviewPanelProps) {
  // Normalize mediaUrls to string format for preview components
  const mediaUrls = rawMediaUrls.map(item =>
    typeof item === 'string' ? item : item.url
  )

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
    <Card>
      <CardHeader className="pb-3 overflow-visible">
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
        <div className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide border-b border-gray-200">
          {selectedPlatforms.map((platformId) => {
            const platform =
              platformConfig[platformId as keyof typeof platformConfig]
            if (!platform) return null

            return (
              <button
                key={platformId}
                onClick={() => setActivePlatform(platformId)}
                className={cn(
                  'flex items-center gap-2 px-1 pb-3 text-sm transition-all whitespace-nowrap border-b-2 -mb-[1px]',
                  activePlatform === platformId
                    ? 'border-blue-600 text-gray-900 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          {activePlatform === 'instagram' ? (
            <InstagramPreview
              content={platformContentToUse}
              mediaUrls={mediaUrls}
              format={instagramFormat}
            />
          ) : activePlatform === 'facebook' ? (
            <FacebookPreview
              content={platformContentToUse}
              mediaUrls={mediaUrls}
              format={facebookFormat}
            />
          ) : activePlatform === 'youtube' ? (
            <YouTubePreview
              content={platformContentToUse}
              mediaUrls={mediaUrls}
              format={youtubeFormat}
              youtubeTitle={youtubeTitle}
              youtubeDescription={youtubeDescription}
              youtubeMediaUrls={youtubeMediaUrls}
            />
          ) : activePlatform === 'pinterest' ? (
            <PinterestPreview
              content={platformContentToUse}
              mediaUrls={mediaUrls}
              pinterestTitle={pinterestTitle}
              pinterestDescription={pinterestDescription}
              pinterestBoard={pinterestBoard}
            />
          ) : (
            <ActivePreviewComponent
              content={platformContentToUse}
              mediaUrls={mediaUrls}
            />
          )}
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-500 mt-3 text-center">
          Preview shows how your post will appear. Actual appearance may vary.
        </p>
      </CardContent>
    </Card>
  )
}

'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Info } from 'lucide-react'

interface AltTextInputProps {
  platform: 'Instagram' | 'Pinterest' | 'Bluesky'
  value: string
  onChange: (value: string) => void
  maxLength?: number
  id?: string
}

const PLATFORM_INFO = {
  Instagram: {
    color: 'from-purple-600 to-pink-600',
    icon: '📸',
    maxLength: 2200, // Instagram's documented limit
    description: 'Helps visually impaired users understand your image'
  },
  Pinterest: {
    color: 'from-red-600 to-red-700',
    icon: '📌',
    maxLength: 500, // Pinterest's alt text limit
    description: 'Improves accessibility and searchability of your pins'
  },
  Bluesky: {
    color: 'from-blue-500 to-sky-500',
    icon: '🦋',
    maxLength: 1000, // Bluesky's alt text limit
    description: 'Makes your posts accessible to all users'
  }
}

/**
 * Alt Text Input Component
 *
 * Reusable component for adding alt text to images across different platforms.
 * Alt text improves accessibility for visually impaired users and can improve SEO.
 *
 * Benefits:
 * - Accessibility: Screen readers use alt text to describe images
 * - SEO: Search engines index alt text for better discoverability
 * - Context: Provides description when images fail to load
 *
 * Best Practices:
 * - Be specific and descriptive
 * - Keep it concise (1-2 sentences)
 * - Don't start with "Image of..." or "Picture of..."
 * - Include relevant context and important details
 */
export function AltTextInput({
  platform,
  value,
  onChange,
  maxLength,
  id
}: AltTextInputProps) {
  const info = PLATFORM_INFO[platform]
  const limit = maxLength || info.maxLength
  const charCount = value.length

  return (
    <Card className={`p-4 ${charCount > limit ? 'border-red-500' : ''}`}>
      {/* Header with label and character counter */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Label htmlFor={id || `alt-text-${platform.toLowerCase()}`} className="text-base">
            <span className="mr-1">{info.icon}</span>
            {platform} Alt Text (Optional)
          </Label>
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
              <p className="font-medium mb-1">What is alt text?</p>
              <p className="mb-2">{info.description}</p>
              <p className="text-gray-300">Example: &quot;Golden retriever playing fetch in a sunny park&quot;</p>
            </div>
          </div>
        </div>
        <span className={`text-xs font-medium ${charCount > limit ? 'text-red-600' : 'text-gray-500'}`}>
          {charCount} / {limit}
        </span>
      </div>

      {/* Textarea - borderless since Card provides border */}
      <Textarea
        id={id || `alt-text-${platform.toLowerCase()}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Describe your image for ${platform} users...`}
        maxLength={limit}
        rows={3}
        className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 mb-3"
      />

      {/* Tips section - blue box inside card */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
        <div className="text-xs text-blue-800">
          <p className="font-medium mb-1">Alt Text Tips:</p>
          <ul className="space-y-0.5">
            <li>• Be specific and concise</li>
            <li>• Describe the key elements</li>
            <li>• Include relevant context</li>
            <li>• Don&apos;t repeat the caption</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}

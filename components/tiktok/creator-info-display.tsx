'use client'

import Image from 'next/image'
import { User } from 'lucide-react'

interface CreatorInfoDisplayProps {
  /** Creator's TikTok username */
  username: string
  /** Creator's avatar URL */
  avatarUrl?: string
  /** Loading state */
  isLoading?: boolean
}

/**
 * Creator Info Display Component
 *
 * Displays the TikTok creator's username and avatar to show users
 * which account will receive the content.
 *
 * IMPORTANT: Required by TikTok's UX Guidelines
 * "Display the creator's nickname so users know which TikTok account receives the content"
 *
 * Reference: https://developers.tiktok.com/doc/content-sharing-guidelines/
 */
export function CreatorInfoDisplay({
  username,
  avatarUrl,
  isLoading = false
}: CreatorInfoDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg border border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg border border-gray-200">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`@${username}`}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {/* Username */}
      <div className="flex-1">
        <p className="text-xs text-gray-600 font-medium">Posting as:</p>
        <p className="text-sm font-semibold text-gray-900">@{username}</p>
      </div>

      {/* TikTok Icon */}
      <div className="text-2xl">♪</div>
    </div>
  )
}

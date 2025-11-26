'use client'

import { cn } from '@/lib/utils'

interface AccountInfo {
  id: string
  username: string
  label?: string | null
}

interface AccountBadgeProps {
  platform: string
  accounts?: AccountInfo[]
  compact?: boolean  // for smaller displays like calendar
  variant?: 'solid' | 'light'  // solid for post-card, light for posted/calendar
  className?: string
}

// Light platform styles (for posted page, calendar)
const platformStylesLight: Record<string, string> = {
  facebook: 'bg-[#1877F2]/10 text-[#1877F2]',
  instagram: 'bg-purple-500/10 text-purple-600',
  twitter: 'bg-black/10 text-gray-900',
  linkedin: 'bg-[#0A66C2]/10 text-[#0A66C2]',
  threads: 'bg-black/10 text-gray-900',
  bluesky: 'bg-[#00A8E8]/10 text-[#00A8E8]',
  youtube: 'bg-[#FF0000]/10 text-[#FF0000]',
  tiktok: 'bg-black/10 text-gray-900',
  pinterest: 'bg-[#E60023]/10 text-[#E60023]',
}

// Solid platform styles (for post-card)
const platformStylesSolid: Record<string, string> = {
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

export function AccountBadge({ platform, accounts, compact = false, variant = 'light', className }: AccountBadgeProps) {
  const displayName = platform.charAt(0).toUpperCase() + platform.slice(1)
  const styles = variant === 'solid' ? platformStylesSolid : platformStylesLight
  const defaultStyle = variant === 'solid' ? 'bg-gray-500 text-white' : 'bg-gray-500/10 text-gray-700'
  const style = styles[platform] || defaultStyle

  // Get display text for accounts (prefer label, fall back to username)
  const accountDisplayText = accounts && accounts.length > 0
    ? accounts.map(a => a.label || a.username).join(', ')
    : null

  // For solid variant, username text should be lighter
  const usernameStyle = variant === 'solid' ? 'text-gray-300' : 'text-gray-500'

  return (
    <div className={cn("flex flex-col", className)}>
      <span
        className={cn(
          "px-1.5 py-0.5 font-medium",
          variant === 'solid' ? "rounded text-xs" : "rounded-full",
          compact ? "text-[9px]" : "text-[10px]",
          style
        )}
      >
        {displayName}
      </span>
      {accountDisplayText && (
        <span
          className={cn(
            "truncate mt-0.5",
            usernameStyle,
            compact ? "text-[8px] max-w-[50px]" : "text-[9px] max-w-[80px]"
          )}
          title={accountDisplayText}
        >
          {accountDisplayText}
        </span>
      )}
    </div>
  )
}

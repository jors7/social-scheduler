/**
 * Preview Utilities for Social Media Platform Previews
 * Handles content formatting, entity detection, and platform-specific rules
 */

export interface DetectedEntity {
  type: 'hashtag' | 'mention' | 'link'
  text: string
  startIndex: number
  endIndex: number
}

/**
 * Strip HTML tags from content (convert to plain text)
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''

  let text = html

  // Decode HTML entities
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Convert common HTML tags to plain text equivalents
  text = text
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '')

  // Clean up extra whitespace
  text = text
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^[\s\n]+|[\s\n]+$/g, '')
    .trim()

  return text
}

/**
 * Detect hashtags in text
 */
export function detectHashtags(text: string): DetectedEntity[] {
  const hashtags: DetectedEntity[] = []
  const regex = /#[\w]+/g
  let match

  while ((match = regex.exec(text)) !== null) {
    hashtags.push({
      type: 'hashtag',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }

  return hashtags
}

/**
 * Detect @mentions in text
 */
export function detectMentions(text: string): DetectedEntity[] {
  const mentions: DetectedEntity[] = []
  const regex = /@[\w]+/g
  let match

  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      type: 'mention',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }

  return mentions
}

/**
 * Detect URLs in text
 */
export function detectLinks(text: string): DetectedEntity[] {
  const links: DetectedEntity[] = []
  const regex = /(https?:\/\/[^\s]+)/g
  let match

  while ((match = regex.exec(text)) !== null) {
    links.push({
      type: 'link',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }

  return links
}

/**
 * Get all entities (hashtags, mentions, links) sorted by position
 */
export function getAllEntities(text: string): DetectedEntity[] {
  const entities = [
    ...detectHashtags(text),
    ...detectMentions(text),
    ...detectLinks(text)
  ]

  return entities.sort((a, b) => a.startIndex - b.startIndex)
}

/**
 * Truncate text with smart handling
 */
export function truncateText(
  text: string,
  limit: number,
  mode: 'hard' | 'soft' = 'soft'
): { text: string; truncated: boolean } {
  if (text.length <= limit) {
    return { text, truncated: false }
  }

  if (mode === 'hard') {
    // Hard truncation: cut exactly at limit
    return {
      text: text.slice(0, limit) + '...',
      truncated: true
    }
  }

  // Soft truncation: try to cut at word boundary
  const truncated = text.slice(0, limit)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > limit * 0.8) {
    // If we can cut at a word boundary near the limit, do it
    return {
      text: truncated.slice(0, lastSpace) + '...',
      truncated: true
    }
  }

  return {
    text: truncated + '...',
    truncated: true
  }
}

/**
 * Format content for specific platform
 */
export function formatContent(content: string, platform: string): string {
  // Strip HTML first
  let formatted = stripHtml(content)

  // Platform-specific formatting
  switch (platform) {
    case 'twitter':
      // Twitter preserves line breaks
      return formatted

    case 'instagram':
    case 'facebook':
    case 'linkedin':
      // These platforms show line breaks
      return formatted

    case 'threads':
    case 'bluesky':
      // Microblogging platforms - keep compact
      return formatted

    case 'pinterest':
      // Pinterest - preserve paragraphs
      return formatted

    case 'tiktok':
    case 'youtube':
      // Video platforms - line breaks work
      return formatted

    default:
      return formatted
  }
}

/**
 * Get character count status for platform
 */
export function getCharacterStatus(
  length: number,
  limit: number
): {
  status: 'good' | 'warning' | 'error'
  percentage: number
  remaining: number
} {
  const percentage = (length / limit) * 100
  const remaining = limit - length

  let status: 'good' | 'warning' | 'error' = 'good'

  if (percentage >= 100) {
    status = 'error'
  } else if (percentage >= 90) {
    status = 'warning'
  }

  return {
    status,
    percentage,
    remaining
  }
}

/**
 * Platform-specific character limits
 */
export const PLATFORM_LIMITS = {
  twitter: 280,
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  youtube: 5000,
  tiktok: 2200,
  threads: 500,
  bluesky: 300,
  pinterest: 500 // Description limit for ads
} as const

/**
 * Get display limit for platform (may differ from actual limit for preview purposes)
 */
export function getDisplayLimit(platform: string): number {
  switch (platform) {
    case 'twitter':
      return 280
    case 'instagram':
      return 125 // Show "...more" after this
    case 'facebook':
      return 250 // Show "See more" after this
    case 'linkedin':
      return 150 // Show "...see more" after this
    case 'threads':
      return 500
    case 'bluesky':
      return 300
    case 'pinterest':
      return 500
    case 'tiktok':
      return 2200
    case 'youtube':
      return 5000
    default:
      return 500
  }
}

/**
 * Check if content exceeds platform limit
 */
export function exceedsLimit(content: string, platform: string): boolean {
  const plainText = stripHtml(content)
  const limit = PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS] || 500
  return plainText.length > limit
}

/**
 * Check if a URL points to a video file
 */
export function isVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  // Strip query parameters and fragments to get the actual file path
  const urlPath = url.split('?')[0].split('#')[0]

  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v']
  return videoExtensions.some(ext => urlPath.toLowerCase().endsWith(ext))
}

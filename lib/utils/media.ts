/**
 * Shared utilities for handling media URLs in both old (string) and new (object) formats
 *
 * Old format: media_urls: ["video.mp4", "image.jpg"]
 * New format: media_urls: [{ url: "video.mp4", thumbnailUrl: "thumb.jpg", type: "video" }]
 */

/**
 * Extracts the URL from media in either string or object format
 * Handles backward compatibility with old string-based media_urls
 */
export function getMediaUrl(media: any): string | null {
  if (!media) return null

  // Old format: direct string URL
  if (typeof media === 'string') {
    return media.trim() || null
  }

  // New format: object with url property
  if (typeof media === 'object' && media.url && typeof media.url === 'string') {
    return media.url.trim() || null
  }

  return null
}

/**
 * Extracts the thumbnail URL from media object (new format only)
 * Returns null for old string format or if no thumbnail exists
 */
export function getMediaThumbnail(media: any): string | null {
  if (!media || typeof media !== 'object') return null

  if (media.thumbnailUrl && typeof media.thumbnailUrl === 'string') {
    return media.thumbnailUrl.trim() || null
  }

  return null
}

/**
 * Checks if a URL points to a video file based on extension
 */
export function isVideoUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') return false

  // Strip query parameters and fragments to get the actual file path
  const urlPath = url.split('?')[0].split('#')[0]

  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.flv', '.wmv']
  return videoExtensions.some(ext => urlPath.toLowerCase().endsWith(ext))
}

/**
 * Checks if a URL points to an image file based on extension
 */
export function isImageUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') return false

  // Strip query parameters and fragments to get the actual file path
  const urlPath = url.split('?')[0].split('#')[0]

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
  return imageExtensions.some(ext => urlPath.toLowerCase().endsWith(ext))
}

/**
 * Gets the first media URL from an array, handling both formats
 */
export function getFirstMediaUrl(mediaUrls: any[]): string | null {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) return null
  return getMediaUrl(mediaUrls[0])
}

/**
 * Gets the first video thumbnail from an array (new format only)
 */
export function getFirstMediaThumbnail(mediaUrls: any[]): string | null {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) return null
  return getMediaThumbnail(mediaUrls[0])
}

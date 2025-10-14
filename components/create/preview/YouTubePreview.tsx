'use client'

import { stripHtml, truncateText, isVideoUrl } from './preview-utils'

interface YouTubePreviewProps {
  content: string
  mediaUrls?: string[]
  format?: 'video' | 'short'
  youtubeTitle?: string
  youtubeDescription?: string
}

export function YouTubePreview({
  content,
  mediaUrls = [],
  format = 'video',
  youtubeTitle,
  youtubeDescription
}: YouTubePreviewProps) {
  // Use YouTube-specific fields if provided, otherwise fall back to content parsing
  let title: string
  let description: string

  if (youtubeTitle || youtubeDescription) {
    // Use the dedicated YouTube fields
    title = youtubeTitle?.slice(0, 100) || 'Untitled Video'
    description = youtubeDescription || ''
  } else {
    // Fall back to parsing content (legacy behavior)
    const plainText = stripHtml(content)
    const lines = plainText.split('\n')
    title = lines[0]?.slice(0, 100) || 'Untitled Video'
    description = lines.slice(1).join('\n')
  }

  // Show first 2 lines of description in preview
  const descriptionLines = description.split('\n').slice(0, 2).join('\n')
  const { text: truncatedTitle } = truncateText(title, 70, 'soft')

  const isShort = format === 'short'

  // YouTube Shorts format - Vertical mobile mockup
  if (isShort) {
    return (
      <div className="bg-black max-w-xs mx-auto rounded-3xl overflow-hidden shadow-2xl">
        {/* Shorts container - 9:16 aspect ratio */}
        {mediaUrls && mediaUrls.length > 0 ? (
          <div className="relative bg-gray-900 aspect-[9/16]">
            {isVideoUrl(mediaUrls[0]) ? (
              <video
                src={mediaUrls[0]}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
            ) : (
              <img
                src={mediaUrls[0]}
                alt=""
                className="w-full h-full object-cover"
              />
            )}

            {/* Top header with YouTube Shorts branding */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"></path>
                </svg>
                <span className="text-white font-semibold text-sm">Shorts</span>
              </div>
            </div>

            {/* Side action buttons (like, dislike, comment, share) */}
            <div className="absolute right-3 bottom-20 flex flex-col gap-4">
              {/* Like */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-800/80 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                </div>
                <span className="text-white text-xs mt-1">Like</span>
              </div>

              {/* Dislike */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-800/80 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                  </svg>
                </div>
                <span className="text-white text-xs mt-1">Dislike</span>
              </div>

              {/* Comment */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-800/80 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </div>
                <span className="text-white text-xs mt-1">0</span>
              </div>

              {/* Share */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-800/80 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                  </svg>
                </div>
                <span className="text-white text-xs mt-1">Share</span>
              </div>

              {/* Menu */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-800/80 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="3" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="10" cy="17" r="1.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bottom info section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="mb-3">
                <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                  {truncatedTitle}
                  {title.length > 70 && '...'}
                </h3>
                <p className="text-white/80 text-xs line-clamp-2">
                  {descriptionLines}
                </p>
              </div>

              {/* Channel info */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-600 flex-shrink-0"></div>
                <span className="text-white text-xs font-medium">Your Channel Name</span>
                <button className="ml-auto bg-white text-black text-xs font-semibold px-4 py-1.5 rounded-full">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-[9/16] bg-gradient-to-br from-red-900 to-red-950 flex flex-col items-center justify-center text-white p-6">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
            </svg>
            <p className="text-sm opacity-75 text-center">Short requires video</p>
            <p className="text-xs opacity-50 text-center mt-2">9:16 vertical format · Max 60s</p>
          </div>
        )}

        {/* Format indicator */}
        <div className="p-3 bg-gray-900 border-t border-gray-800">
          <p className="text-white text-xs text-center">
            🎬 YouTube Short Preview (9:16) · Max 60 seconds
          </p>
        </div>

        {/* Character limits */}
        <div className="p-3 bg-gray-900 border-t border-gray-800">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-white">
              <span className="text-gray-400">Title:</span>
              <span className={title.length > 100 ? 'text-red-400 font-medium' : title.length > 70 ? 'text-yellow-400 font-medium' : 'text-white'}>
                {title.length} / 100 chars
              </span>
            </div>
            {title.length > 100 && (
              <p className="text-red-400 text-xs">
                ⚠️ Title exceeds 100 character limit
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Regular YouTube Video format
  return (
    <div className="bg-white max-w-md mx-auto">
      {/* Video card */}
      <div className="rounded-xl overflow-hidden shadow-md">
        {/* Thumbnail - 16:9 aspect ratio */}
        {mediaUrls && mediaUrls.length > 0 ? (
          <div className="relative bg-gray-900 aspect-video">
            {isVideoUrl(mediaUrls[0]) ? (
              <video
                src={mediaUrls[0]}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
            ) : (
              <img
                src={mediaUrls[0]}
                alt=""
                className="w-full h-full object-cover"
              />
            )}

            {/* Duration badge */}
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
              0:00
            </div>

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors cursor-pointer">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
              </svg>
              <p className="text-gray-500 text-xs">No thumbnail</p>
            </div>
          </div>
        )}

        {/* Video info */}
        <div className="p-3 bg-white">
          <div className="flex gap-3">
            {/* Channel avatar */}
            <div className="w-9 h-9 rounded-full bg-red-600 flex-shrink-0"></div>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="font-medium text-sm text-gray-900 leading-tight line-clamp-2 mb-1">
                {truncatedTitle}
                {title.length > 70 && '...'}
              </h3>

              {/* Channel name and stats */}
              <div className="text-xs text-gray-600 space-y-0.5">
                <p>Your Channel Name</p>
                <p>0 views · Just now</p>
              </div>
            </div>

            {/* Three dots menu */}
            <button className="text-gray-600 mt-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="3" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="17" r="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Description preview */}
      {description && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Description Preview</h4>
          <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-2">
            {descriptionLines}
          </p>
          {description.length > 100 && (
            <button className="text-xs text-blue-600 mt-1">Show more</button>
          )}
        </div>
      )}

      {/* Character limits */}
      <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Title:</span>
            <span className={title.length > 100 ? 'text-red-500 font-medium' : title.length > 70 ? 'text-yellow-600 font-medium' : 'text-gray-900'}>
              {title.length} / 100 chars
            </span>
          </div>
          {title.length > 70 && title.length <= 100 && (
            <p className="text-yellow-600 text-xs">
              ℹ️ Title will be truncated at 70 characters in search results
            </p>
          )}
          {title.length > 100 && (
            <p className="text-red-500 text-xs">
              ⚠️ Title exceeds 100 character limit
            </p>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Description:</span>
            <span className={description.length > 5000 ? 'text-red-500 font-medium' : 'text-gray-900'}>
              {description.length} / 5,000 chars
            </span>
          </div>
          {description.length > 5000 && (
            <p className="text-red-500 text-xs mt-2">
              ⚠️ Description exceeds 5,000 character limit
            </p>
          )}
        </div>
      </div>

      {/* Format note */}
      <p className="text-xs text-gray-500 text-center mt-3">
        💡 First line becomes title, rest becomes description
      </p>
    </div>
  )
}

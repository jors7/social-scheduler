'use client'

import { stripHtml, truncateText } from './preview-utils'

interface YouTubePreviewProps {
  content: string
  mediaUrls?: string[]
}

export function YouTubePreview({ content, mediaUrls = [] }: YouTubePreviewProps) {
  const plainText = stripHtml(content)

  // Extract title (first line, max 100 chars) and description (rest)
  const lines = plainText.split('\n')
  const title = lines[0]?.slice(0, 100) || 'Untitled Video'
  const description = lines.slice(1).join('\n')

  // Show first 2 lines of description in preview
  const descriptionLines = description.split('\n').slice(0, 2).join('\n')
  const { text: truncatedTitle } = truncateText(title, 70, 'soft')

  return (
    <div className="bg-white max-w-md mx-auto">
      {/* Video card */}
      <div className="rounded-xl overflow-hidden shadow-md">
        {/* Thumbnail - 16:9 aspect ratio */}
        {mediaUrls && mediaUrls.length > 0 ? (
          <div className="relative bg-gray-900 aspect-video">
            <img
              src={mediaUrls[0]}
              alt=""
              className="w-full h-full object-cover"
            />

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

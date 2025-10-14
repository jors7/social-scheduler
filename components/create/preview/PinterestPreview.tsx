'use client'

import { stripHtml, isVideoUrl } from './preview-utils'

interface PinterestPreviewProps {
  content: string
  mediaUrls?: string[]
  pinterestTitle?: string
  pinterestDescription?: string
  pinterestBoard?: string
}

export function PinterestPreview({
  content,
  mediaUrls = [],
  pinterestTitle,
  pinterestDescription,
  pinterestBoard
}: PinterestPreviewProps) {
  // Use Pinterest-specific fields if provided, otherwise fall back to content parsing
  let title: string
  let description: string

  if (pinterestTitle || pinterestDescription) {
    // Use the dedicated Pinterest fields
    title = pinterestTitle?.slice(0, 100) || 'Untitled Pin'
    description = pinterestDescription?.slice(0, 500) || ''
  } else {
    // Fall back to parsing content (legacy behavior)
    const plainText = stripHtml(content)
    const lines = plainText.split('\n')
    title = lines[0]?.slice(0, 100) || 'Untitled Pin'
    description = lines.slice(1).join('\n').slice(0, 500)
  }

  return (
    <div className="bg-gray-50 max-w-sm mx-auto">
      {/* Pin card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
        {/* Image - 2:3 vertical aspect ratio (1000x1500) */}
        {mediaUrls && mediaUrls.length > 0 ? (
          <div className="relative bg-gray-100 aspect-[2/3]">
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
            {/* Save button overlay */}
            <div className="absolute top-3 right-3">
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg transition-colors">
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="aspect-[2/3] bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
            <span className="text-gray-400 text-sm">No image</span>
          </div>
        )}

        {/* Pin details */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-700 line-clamp-3 mb-3">
              {description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-8 h-8 rounded-full bg-red-100 flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {pinterestBoard || 'Your Board'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Character limits info */}
      <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Title:</span>
            <span className={title.length > 100 ? 'text-red-500 font-medium' : 'text-gray-900'}>
              {title.length} / 100 chars
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Description:</span>
            <span className={description.length > 500 ? 'text-red-500 font-medium' : 'text-gray-900'}>
              {description.length} / 500 chars
            </span>
          </div>
        </div>
        {title.length > 100 && (
          <p className="text-red-500 text-xs mt-2">
            ⚠️ Title exceeds 100 characters
          </p>
        )}
        {description.length > 500 && (
          <p className="text-red-500 text-xs mt-2">
            ⚠️ Description exceeds 500 characters
          </p>
        )}
      </div>

      {/* Pinterest branding note */}
      <p className="text-xs text-gray-500 text-center mt-3">
        💡 First line becomes title, rest becomes description
      </p>
    </div>
  )
}

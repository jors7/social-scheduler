'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

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

  const handlePrevMedia = () => {
    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaUrls.length - 1))
  }

  const handleNextMedia = () => {
    setCurrentMediaIndex((prev) => (prev < mediaUrls.length - 1 ? prev + 1 : 0))
  }

  return (
    <div className="bg-gray-50 max-w-sm mx-auto">
      {/* Pin card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
        {/* Image - 2:3 vertical aspect ratio (1000x1500) */}
        {mediaUrls && mediaUrls.length > 0 ? (
          <div className="relative bg-gray-100 aspect-[2/3]">
            {isVideoUrl(mediaUrls[currentMediaIndex]) ? (
              <video
                src={mediaUrls[currentMediaIndex]}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
            ) : (
              <img
                src={mediaUrls[currentMediaIndex]}
                alt=""
                className="w-full h-full object-cover"
              />
            )}

            {/* Navigation arrows (only show if multiple media) */}
            {mediaUrls.length > 1 && (
              <>
                <button
                  onClick={handlePrevMedia}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextMedia}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                  aria-label="Next media"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Carousel counter */}
                <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {currentMediaIndex + 1}/{mediaUrls.length}
                </div>
                {/* Dot indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {mediaUrls.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        index === currentMediaIndex ? 'bg-white' : 'bg-white/60'
                      }`}
                      aria-label={`Go to media ${index + 1}`}
                    />
                  ))}
                </div>
              </>
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

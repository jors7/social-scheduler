'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { stripHtml, truncateText, getAllEntities, isVideoUrl } from './preview-utils'

interface InstagramPreviewProps {
  content: string
  mediaUrls?: string[]
  format?: 'feed-square' | 'feed-portrait' | 'feed-landscape' | 'story' | 'reel'
}

export function InstagramPreview({ content, mediaUrls = [], format = 'feed-portrait' }: InstagramPreviewProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

  const plainText = stripHtml(content)
  // Instagram shows ~125 chars then "...more"
  const { text, truncated } = truncateText(plainText, 125, 'soft')
  const entities = getAllEntities(text)

  const handlePrevMedia = () => {
    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaUrls.length - 1))
  }

  const handleNextMedia = () => {
    setCurrentMediaIndex((prev) => (prev < mediaUrls.length - 1 ? prev + 1 : 0))
  }

  // Determine aspect ratio based on format
  const getAspectRatio = () => {
    switch (format) {
      case 'feed-square':
        return 'aspect-[1/1]'
      case 'feed-portrait':
        return 'aspect-[4/5]'
      case 'feed-landscape':
        return 'aspect-[1.91/1]'
      case 'story':
      case 'reel':
        return 'aspect-[9/16]'
      default:
        return 'aspect-[4/5]'
    }
  }

  const isStoryFormat = format === 'story' || format === 'reel'

  const renderContent = () => {
    if (entities.length === 0) {
      return <span>{text}</span>
    }

    const parts = []
    let lastIndex = 0

    entities.forEach((entity, i) => {
      if (entity.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${i}`}>{text.slice(lastIndex, entity.startIndex)}</span>
        )
      }

      parts.push(
        <span
          key={`entity-${i}`}
          className={entity.type === 'hashtag' || entity.type === 'mention' ? 'text-blue-900 font-medium' : 'text-blue-900'}
        >
          {entity.text}
        </span>
      )

      lastIndex = entity.endIndex
    })

    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.slice(lastIndex)}</span>)
    }

    return <>{parts}</>
  }

  // Story/Reel format - Vertical mobile mockup
  if (isStoryFormat) {
    return (
      <div className="bg-black max-w-xs mx-auto rounded-3xl overflow-hidden shadow-2xl">
        {/* Story/Reel container - 9:16 aspect ratio */}
        {mediaUrls && mediaUrls.length > 0 ? (
          <div className={`relative bg-gray-900 ${getAspectRatio()}`}>
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
              </>
            )}

            {/* Top header */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 border-2 border-white"></div>
                <span className="text-white font-semibold text-sm">your_username</span>
                <span className="text-white/80 text-xs">1m</span>
              </div>
              {/* Carousel indicators */}
              {mediaUrls.length > 1 && (
                <div className="flex gap-1 mt-3">
                  {mediaUrls.map((_, index) => (
                    <div
                      key={index}
                      className={`h-0.5 flex-1 rounded-full transition-colors ${
                        index === currentMediaIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom caption area (if there's content) */}
            {plainText && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-sm leading-tight whitespace-pre-wrap break-words line-clamp-3">
                  {renderContent()}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className={`${getAspectRatio()} bg-gradient-to-br from-purple-900 to-pink-900 flex flex-col items-center justify-center text-white p-6`}>
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
            <p className="text-sm opacity-75 text-center">{format === 'story' ? 'Story' : 'Reel'} requires media</p>
            <p className="text-xs opacity-50 text-center mt-2">9:16 vertical format</p>
          </div>
        )}

        {/* Format indicator */}
        <div className="p-3 bg-gray-900 border-t border-gray-800">
          <p className="text-white text-xs text-center">
            📱 {format === 'story' ? 'Story Preview' : 'Reel Preview'} (9:16)
          </p>
        </div>
      </div>
    )
  }

  // Feed format - Standard Instagram post
  return (
    <div className="bg-white max-w-sm mx-auto shadow-md border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-200">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">your_username</p>
        </div>
        <button className="text-gray-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="19" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Image - Dynamic aspect ratio based on format */}
      {mediaUrls && mediaUrls.length > 0 ? (
        <div className={`relative bg-gray-100 ${getAspectRatio()}`}>
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
            </>
          )}

          {/* Carousel indicator if multiple images */}
          {mediaUrls.length > 1 && (
            <>
              <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {currentMediaIndex + 1}/{mediaUrls.length}
              </div>
              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {mediaUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      index === currentMediaIndex ? 'bg-blue-500' : 'bg-gray-400'
                    }`}
                    aria-label={`Go to media ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={`${getAspectRatio()} bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center`}>
          <span className="text-gray-400 text-sm">No media</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </div>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>

      {/* Likes */}
      <div className="px-3 pb-2">
        <p className="font-semibold text-sm text-gray-900">0 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm text-gray-900">
          <span className="font-semibold">your_username</span>{' '}
          <span className="whitespace-pre-wrap break-words">
            {renderContent()}
            {truncated && (
              <span className="text-gray-500">
                ... <button className="text-gray-500">more</button>
              </span>
            )}
          </span>
        </p>
        {plainText.length > 2200 && (
          <p className="text-xs text-red-500 mt-2">
            ⚠️ Exceeds 2,200 character limit
          </p>
        )}
      </div>

      {/* Timestamp */}
      <div className="px-3 pb-3">
        <p className="text-xs text-gray-500 uppercase">1 minute ago</p>
      </div>
    </div>
  )
}

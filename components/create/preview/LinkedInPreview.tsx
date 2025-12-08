'use client'

import { useState } from 'react'
import { ThumbsUp, MessageSquare, Repeat2, ChevronLeft, ChevronRight } from 'lucide-react'
import { stripHtml, truncateText, getAllEntities, isVideoUrl } from './preview-utils'

interface LinkedInPreviewProps {
  content: string
  mediaUrls?: string[]
}

export function LinkedInPreview({ content, mediaUrls = [] }: LinkedInPreviewProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

  const plainText = stripHtml(content)
  // LinkedIn shows ~150 chars then "...see more"
  const { text, truncated } = truncateText(plainText, 150, 'soft')
  const entities = getAllEntities(text)

  const handlePrevMedia = () => {
    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaUrls.length - 1))
  }

  const handleNextMedia = () => {
    setCurrentMediaIndex((prev) => (prev < mediaUrls.length - 1 ? prev + 1 : 0))
  }

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
          className="text-blue-600 font-medium hover:underline"
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

  return (
    <div className="bg-white max-w-lg mx-auto shadow-md border border-gray-300 rounded-lg">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-2">
          <div className="w-12 h-12 rounded-full bg-blue-700 flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900">Your Name</p>
            <p className="text-xs text-gray-600">Your Professional Title</p>
            <p className="text-xs text-gray-500">1m · 🌎</p>
          </div>
          <button className="text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="2" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="14" cy="8" r="1.5" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="mt-3 text-sm text-gray-900 leading-5 whitespace-pre-wrap break-words">
          {renderContent()}
          {truncated && (
            <button className="text-gray-600 hover:text-blue-700 hover:underline ml-1">
              ...see more
            </button>
          )}
        </div>
      </div>

      {/* Media - natural aspect ratio (1.91:1 landscape recommended for best display) */}
      {mediaUrls && mediaUrls.length > 0 && (
        <div className="relative bg-gray-100">
          {isVideoUrl(mediaUrls[currentMediaIndex]) ? (
            <video
              src={mediaUrls[currentMediaIndex]}
              className="w-full max-h-[600px] object-contain"
              muted
              preload="metadata"
            />
          ) : (
            <img
              src={mediaUrls[currentMediaIndex]}
              alt=""
              className="w-full max-h-[600px] object-contain"
            />
          )}

          {/* Navigation arrows (only show if multiple media) */}
          {mediaUrls.length > 1 && (
            <>
              <button
                onClick={handlePrevMedia}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                aria-label="Previous media"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNextMedia}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                aria-label="Next media"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              {/* Carousel counter */}
              <div className="absolute top-3 right-3 bg-black/60 text-white text-sm px-3 py-1.5 rounded-full">
                {currentMediaIndex + 1}/{mediaUrls.length}
              </div>
              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {mediaUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentMediaIndex ? 'bg-blue-600' : 'bg-white/60'
                    }`}
                    aria-label={`Go to media ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 rounded-full bg-blue-500 border border-white flex items-center justify-center text-[8px]">
              👍
            </div>
            <div className="w-4 h-4 rounded-full bg-red-500 border border-white flex items-center justify-center text-[8px]">
              ❤️
            </div>
          </div>
          <span>0</span>
        </div>
        <div className="flex items-center gap-2">
          <span>0 comments</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-around">
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
          <ThumbsUp className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
          <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
          <Repeat2 className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">Repost</span>
        </button>
      </div>

      {plainText.length > 3000 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">
            ⚠️ Exceeds 3,000 character limit
          </p>
        </div>
      )}
    </div>
  )
}

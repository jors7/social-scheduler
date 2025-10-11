'use client'

import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react'
import { stripHtml, truncateText, getAllEntities } from './preview-utils'

interface FacebookPreviewProps {
  content: string
  mediaUrls?: string[]
}

export function FacebookPreview({ content, mediaUrls = [] }: FacebookPreviewProps) {
  const plainText = stripHtml(content)
  // Facebook shows ~250 chars then "See more"
  const { text, truncated } = truncateText(plainText, 250, 'soft')
  const entities = getAllEntities(text)

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
          className={entity.type === 'link' ? 'text-blue-600 hover:underline' : 'text-blue-600 font-medium'}
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
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900">Your Name</p>
            <p className="text-xs text-gray-500">Just now · 🌎</p>
          </div>
          <button className="text-gray-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="3" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="17" r="1.5" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="mt-3 text-[15px] text-gray-900 leading-5 whitespace-pre-wrap break-words">
          {renderContent()}
          {truncated && (
            <button className="text-gray-500 hover:underline ml-1">See more</button>
          )}
        </div>
      </div>

      {/* Media - 1.91:1 aspect ratio for landscape */}
      {mediaUrls && mediaUrls.length > 0 && (
        <div className="relative">
          {mediaUrls.length === 1 ? (
            <div className="relative bg-gray-100 aspect-[1.91/1]">
              <img
                src={mediaUrls[0]}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`grid gap-0.5 ${
              mediaUrls.length === 2 ? 'grid-cols-2' :
              mediaUrls.length === 3 ? 'grid-cols-3' :
              'grid-cols-2'
            }`}>
              {mediaUrls.slice(0, 4).map((url, index) => (
                <div
                  key={index}
                  className="relative bg-gray-100 aspect-square"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && mediaUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xl font-bold">
                      +{mediaUrls.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <span className="text-blue-500">👍</span>
            <span className="text-red-500">❤️</span>
            <span>0</span>
          </div>
          <div className="flex items-center gap-3">
            <span>0 comments</span>
            <span>0 shares</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-around">
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-md transition-colors">
          <ThumbsUp className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-md transition-colors">
          <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-md transition-colors">
          <Share2 className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>

      {plainText.length > 63206 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">
            ⚠️ Exceeds 63,206 character limit
          </p>
        </div>
      )}
    </div>
  )
}

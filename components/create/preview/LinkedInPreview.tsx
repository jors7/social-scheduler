'use client'

import { ThumbsUp, MessageSquare, Repeat2 } from 'lucide-react'
import { stripHtml, truncateText, getAllEntities } from './preview-utils'

interface LinkedInPreviewProps {
  content: string
  mediaUrls?: string[]
}

export function LinkedInPreview({ content, mediaUrls = [] }: LinkedInPreviewProps) {
  const plainText = stripHtml(content)
  // LinkedIn shows ~150 chars then "...see more"
  const { text, truncated } = truncateText(plainText, 150, 'soft')
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

      {/* Media - 1.91:1 aspect ratio */}
      {mediaUrls && mediaUrls.length > 0 && (
        <div className="relative">
          <div className="relative bg-gray-100 aspect-[1.91/1]">
            <img
              src={mediaUrls[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
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

'use client'

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
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          <span className="text-sm font-medium">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span className="text-sm font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          <span className="text-sm font-medium">Repost</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          <span className="text-sm font-medium">Send</span>
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

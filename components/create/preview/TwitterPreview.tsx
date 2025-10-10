'use client'

import { stripHtml, truncateText, getAllEntities, getCharacterStatus } from './preview-utils'

interface TwitterPreviewProps {
  content: string
  mediaUrls?: string[]
}

export function TwitterPreview({ content, mediaUrls = [] }: TwitterPreviewProps) {
  const plainText = stripHtml(content)
  const { text, truncated } = truncateText(plainText, 280, 'hard')
  const charStatus = getCharacterStatus(plainText.length, 280)
  const entities = getAllEntities(text)

  // Helper to render text with highlighted entities
  const renderContent = () => {
    if (entities.length === 0) {
      return <span>{text}</span>
    }

    const parts = []
    let lastIndex = 0

    entities.forEach((entity, i) => {
      // Add text before entity
      if (entity.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${i}`}>{text.slice(lastIndex, entity.startIndex)}</span>
        )
      }

      // Add entity with styling
      parts.push(
        <span
          key={`entity-${i}`}
          className={
            entity.type === 'link'
              ? 'text-blue-500 hover:underline'
              : 'text-blue-500'
          }
        >
          {entity.text}
        </span>
      )

      lastIndex = entity.endIndex
    })

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.slice(lastIndex)}</span>)
    }

    return <>{parts}</>
  }

  return (
    <div className="bg-white rounded-2xl p-4 max-w-xl mx-auto shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Profile pic */}
        <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0"></div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[15px] text-gray-900">Your Name</span>
            <span className="text-gray-500 text-[15px]">@username</span>
            <span className="text-gray-500 text-[15px]">· 1m</span>
          </div>

          {/* Content */}
          <div className="mt-1 text-[15px] text-gray-900 leading-5 whitespace-pre-wrap break-words">
            {renderContent()}
          </div>

          {/* Media */}
          {mediaUrls && mediaUrls.length > 0 && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
              <div
                className={`grid gap-0.5 ${
                  mediaUrls.length === 1
                    ? 'grid-cols-1'
                    : mediaUrls.length === 2
                    ? 'grid-cols-2'
                    : mediaUrls.length === 3
                    ? 'grid-cols-2'
                    : 'grid-cols-2'
                }`}
              >
                {mediaUrls.slice(0, 4).map((url, index) => (
                  <div
                    key={index}
                    className={`relative bg-gray-200 ${
                      mediaUrls.length === 3 && index === 0
                        ? 'row-span-2'
                        : 'aspect-[7/8]'
                    }`}
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Engagement buttons */}
          <div className="flex items-center justify-between mt-3 text-gray-500 max-w-md">
            <div className="flex items-center gap-1 text-[13px]">
              <div className="w-5 h-5 flex items-center justify-center">💬</div>
              <span>0</span>
            </div>
            <div className="flex items-center gap-1 text-[13px]">
              <div className="w-5 h-5 flex items-center justify-center">🔁</div>
              <span>0</span>
            </div>
            <div className="flex items-center gap-1 text-[13px]">
              <div className="w-5 h-5 flex items-center justify-center">❤️</div>
              <span>0</span>
            </div>
            <div className="flex items-center gap-1 text-[13px]">
              <div className="w-5 h-5 flex items-center justify-center">📊</div>
              <span>0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Character count indicator */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span
            className={
              charStatus.status === 'error'
                ? 'text-red-500 font-medium'
                : charStatus.status === 'warning'
                ? 'text-yellow-600 font-medium'
                : 'text-gray-500'
            }
          >
            {plainText.length} / 280 characters
          </span>
          {truncated && (
            <span className="text-red-500 font-medium">Content truncated!</span>
          )}
        </div>
        {charStatus.status === 'error' && (
          <p className="text-red-500 text-xs mt-1">
            ⚠️ Tweet exceeds 280 character limit by {Math.abs(charStatus.remaining)} characters
          </p>
        )}
      </div>
    </div>
  )
}

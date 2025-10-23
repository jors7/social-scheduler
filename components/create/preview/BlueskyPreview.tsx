'use client'

import { stripHtml, truncateText, getAllEntities, getCharacterStatus, isVideoUrl } from './preview-utils'

interface BlueskyPreviewProps {
  content: string
  mediaUrls?: string[]
}

export function BlueskyPreview({ content, mediaUrls = [] }: BlueskyPreviewProps) {
  const plainText = stripHtml(content)
  const { text, truncated } = truncateText(plainText, 300, 'hard')
  const charStatus = getCharacterStatus(plainText.length, 300)
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
          className="text-blue-500 hover:underline"
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
    <div className="bg-white max-w-xl mx-auto shadow-sm border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex-shrink-0"></div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[15px] text-gray-900">Your Name</span>
            <span className="text-gray-500 text-[15px]">@yourhandle.bsky.social</span>
            <span className="text-gray-500 text-[15px]">· 1m</span>
          </div>

          {/* Content */}
          <div className="mt-1 text-[15px] text-gray-900 leading-5 whitespace-pre-wrap break-words">
            {renderContent()}
          </div>

          {/* Media - up to 4 images (single image natural, grid for multiple) */}
          {mediaUrls && mediaUrls.length > 0 && (
            <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
              {mediaUrls.length === 1 ? (
                <div className="relative bg-gray-200 max-h-[500px]">
                  {isVideoUrl(mediaUrls[0]) ? (
                    <video
                      src={mediaUrls[0]}
                      className="w-full h-full object-contain"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={mediaUrls[0]}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <div
                  className={`grid gap-0.5 ${
                    mediaUrls.length === 2
                      ? 'grid-cols-2'
                      : mediaUrls.length === 3
                      ? 'grid-cols-3'
                      : 'grid-cols-2'
                  }`}
                >
                  {mediaUrls.slice(0, 4).map((url, index) => (
                    <div
                      key={index}
                      className="relative bg-gray-200 aspect-square"
                    >
                      {isVideoUrl(url) ? (
                        <video
                          src={url}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-6 mt-3 text-gray-500">
            <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span className="text-xs">0</span>
            </button>
            <button className="flex items-center gap-1 hover:text-green-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <span className="text-xs">0</span>
            </button>
            <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span className="text-xs">0</span>
            </button>
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
            {plainText.length} / 300 characters
          </span>
          {truncated && (
            <span className="text-red-500 font-medium">Content truncated!</span>
          )}
        </div>
        {charStatus.status === 'error' && (
          <p className="text-red-500 text-xs mt-1">
            ⚠️ Exceeds 300 character limit by {Math.abs(charStatus.remaining)} characters
          </p>
        )}
      </div>
    </div>
  )
}

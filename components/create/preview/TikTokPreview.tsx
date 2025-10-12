'use client'

import { stripHtml, truncateText, isVideoUrl } from './preview-utils'

interface TikTokPreviewProps {
  content: string
  mediaUrls?: string[]
}

export function TikTokPreview({ content, mediaUrls = [] }: TikTokPreviewProps) {
  const plainText = stripHtml(content)
  const { text } = truncateText(plainText, 2200, 'soft')

  return (
    <div className="bg-black max-w-xs mx-auto rounded-3xl overflow-hidden shadow-2xl">
      {/* TikTok mobile UI mockup */}
      <div className="relative">
        {/* Video container - 9:16 aspect ratio */}
        {mediaUrls && mediaUrls.length > 0 ? (
          <div className="relative bg-gray-900 aspect-[9/16]">
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

            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Top UI elements */}
            <div className="absolute top-4 right-4 flex flex-col gap-3 items-center">
              <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
              </button>
              <div className="text-center text-white text-xs">
                <div>0</div>
              </div>

              <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
                </svg>
              </button>
              <div className="text-center text-white text-xs">
                <div>0</div>
              </div>

              <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                </svg>
              </button>
              <div className="text-center text-white text-xs">
                <div>0</div>
              </div>
            </div>

            {/* Bottom caption area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500"></div>
                <span className="text-white font-semibold text-sm">@yourusername</span>
                <button className="ml-auto px-4 py-1 bg-red-500 text-white text-xs font-bold rounded-md">
                  Follow
                </button>
              </div>

              {/* Caption with hashtags highlighted */}
              <div className="text-white text-sm leading-tight whitespace-pre-wrap break-words max-h-20 overflow-hidden">
                {text.split(' ').map((word, i) => (
                  <span key={i}>
                    {word.startsWith('#') ? (
                      <span className="font-bold">{word}</span>
                    ) : (
                      word
                    )}{' '}
                  </span>
                ))}
              </div>

              {/* Audio indicator */}
              <div className="flex items-center gap-2 mt-2">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"></path>
                </svg>
                <span className="text-white text-xs">Original sound</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-white p-6">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="2" y1="7" x2="7" y2="7"></line>
              <line x1="2" y1="17" x2="7" y2="17"></line>
              <line x1="17" y1="17" x2="22" y2="17"></line>
              <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>
            <p className="text-sm opacity-75 text-center">TikTok requires video content</p>
            <p className="text-xs opacity-50 text-center mt-2">9:16 vertical format</p>
          </div>
        )}
      </div>

      {/* Character count */}
      {plainText.length > 2200 && (
        <div className="p-3 bg-gray-900 border-t border-gray-800">
          <p className="text-red-500 text-xs text-center">
            ⚠️ Exceeds 2,200 character limit
          </p>
        </div>
      )}
    </div>
  )
}

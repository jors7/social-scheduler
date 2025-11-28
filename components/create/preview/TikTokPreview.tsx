'use client'

import { stripHtml, truncateText, isVideoUrl } from './preview-utils'

interface TikTokPreviewProps {
  content: string
  mediaUrls?: string[]
  /** TikTok-specific caption/title (for videos this IS the caption, max 2200 chars) */
  tiktokTitle?: string
}

export function TikTokPreview({ content, mediaUrls = [], tiktokTitle }: TikTokPreviewProps) {
  // Use tiktokTitle if provided, otherwise fall back to content
  const displayContent = tiktokTitle || content
  const plainText = stripHtml(displayContent)
  const { text } = truncateText(plainText, 2200, 'soft')

  return (
    <div className="bg-black max-w-xs mx-auto rounded-3xl overflow-hidden shadow-2xl">
      {/* TikTok mobile UI mockup */}
      <div className="relative">
        {/* Video container - 9:16 aspect ratio */}
        {mediaUrls && mediaUrls.length > 0 ? (
          <div className="flex flex-col">
            {/* Video area - true 9:16 */}
            <div className="relative bg-gray-900 aspect-[9/16] overflow-hidden">
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

              {/* Top navigation bar */}
              <div className="absolute top-0 left-0 right-0 px-4 pt-3 pb-2 flex items-center justify-between">
                <span className="text-white text-xs font-semibold opacity-70">LIVE</span>
                <div className="flex items-center gap-4">
                  <span className="text-white text-sm opacity-70">Explore</span>
                  <span className="text-white text-sm opacity-70">Following</span>
                  <span className="text-white text-sm font-semibold border-b-2 border-white pb-0.5">For You</span>
                </div>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="M21 21l-4.35-4.35"></path>
                </svg>
              </div>

              {/* Right sidebar */}
              <div className="absolute right-2 bottom-4 flex flex-col gap-3 items-center">
                {/* Profile picture with follow button */}
                <div className="relative mb-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 border-2 border-white"></div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#fe2c55] rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                {/* Heart/Like */}
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <span className="text-white text-[11px] font-semibold">245.1K</span>
                </div>

                {/* Comments */}
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <span className="text-white text-[11px] font-semibold">3,940</span>
                </div>

                {/* Bookmark */}
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <span className="text-white text-[11px] font-semibold">31.5K</span>
                </div>

                {/* Share - arrow icon */}
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 5v4h5l-8 9-8-9h5V5h6z" transform="rotate(-90 12 12)"/>
                    </svg>
                  </div>
                  <span className="text-white text-[11px] font-semibold">6,819</span>
                </div>

                {/* Music disc */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-600 flex items-center justify-center animate-spin-slow">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                </div>
              </div>

              {/* Bottom content area */}
              <div className="absolute bottom-2 left-0 right-12 px-3">
                {/* Username */}
                <div className="mb-1">
                  <span className="text-white font-bold text-sm">@yourusername</span>
                </div>

                {/* Caption with hashtags highlighted */}
                <div className="text-white text-xs leading-snug whitespace-pre-wrap break-words line-clamp-2">
                  {text.split(' ').map((word, i) => (
                    <span key={i}>
                      {word.startsWith('#') ? (
                        <span className="font-semibold">{word}</span>
                      ) : word.startsWith('@') ? (
                        <span className="font-semibold">{word}</span>
                      ) : (
                        word
                      )}{' '}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom navigation bar - OUTSIDE the 9:16 container */}
            <div className="bg-black px-2 py-2 flex items-center justify-around">
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span className="text-white text-[10px] mt-0.5">Home</span>
              </div>
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                </svg>
                <span className="text-white/60 text-[10px] mt-0.5">Discover</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-11 h-7 bg-white rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#00f2ea] rounded-l-lg"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-[#fe2c55] rounded-r-lg"></div>
                  <svg className="w-5 h-5 text-black relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
                <span className="text-white/60 text-[10px] mt-0.5">Inbox</span>
              </div>
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span className="text-white/60 text-[10px] mt-0.5">Profile</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Empty video area - true 9:16 */}
            <div className="aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-white p-6 relative">
              {/* Top nav even when no media */}
              <div className="absolute top-0 left-0 right-0 px-4 pt-3 pb-2 flex items-center justify-between">
                <span className="text-white text-xs font-semibold opacity-50">LIVE</span>
                <div className="flex items-center gap-4">
                  <span className="text-white text-sm opacity-50">Following</span>
                  <span className="text-white text-sm font-semibold opacity-70">For You</span>
                </div>
                <svg className="w-5 h-5 text-white opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="M21 21l-4.35-4.35"></path>
                </svg>
              </div>

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

            {/* Bottom navigation bar - OUTSIDE the 9:16 container */}
            <div className="bg-black px-2 py-2 flex items-center justify-around">
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span className="text-white text-[10px] mt-0.5">Home</span>
              </div>
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                </svg>
                <span className="text-white/60 text-[10px] mt-0.5">Discover</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-11 h-7 bg-white rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#00f2ea] rounded-l-lg"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-[#fe2c55] rounded-r-lg"></div>
                  <svg className="w-5 h-5 text-black relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
                <span className="text-white/60 text-[10px] mt-0.5">Inbox</span>
              </div>
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span className="text-white/60 text-[10px] mt-0.5">Profile</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Character count */}
      {plainText.length > 2200 && (
        <div className="p-3 bg-gray-900 border-t border-gray-800">
          <p className="text-red-500 text-xs text-center">
            Exceeds 2,200 character limit
          </p>
        </div>
      )}
    </div>
  )
}

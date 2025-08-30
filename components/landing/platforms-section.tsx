'use client'

const platforms = [
  { name: 'X (Twitter)', icon: '𝕏' },
  { name: 'Instagram', icon: '📸' },
  { name: 'Facebook', icon: 'f' },
  { name: 'LinkedIn', icon: 'in' },
  { name: 'YouTube', icon: '▶' },
  { name: 'TikTok', icon: '♫' },
  { name: 'Threads', icon: '@' },
  { name: 'Bluesky', icon: '🦋' },
  { name: 'Pinterest', icon: '📌' },
]

export function PlatformsSection() {
  return (
    <div className="text-center pt-16 pb-2 px-4">
      <p className="text-sm text-gray-500 mb-6 font-medium uppercase tracking-wider">Works seamlessly with</p>
      {/* Mobile: Two rows with centered bottom row, Desktop: Single row */}
      <div className="sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
        {/* First row - 5 icons on mobile */}
        <div className="grid grid-cols-5 gap-3 mb-3 sm:contents">
          {platforms.slice(0, 5).map((platform, index) => (
            <div
              key={platform.name}
              className="group relative sm:mb-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl shadow-sm group-hover:shadow-lg transform group-hover:-translate-y-1 transition-all duration-300 border border-gray-100">
                <span className="text-lg sm:text-xl font-bold text-gray-700 group-hover:text-gray-900">
                  {platform.icon}
                </span>
              </div>
              <span className="absolute top-14 sm:top-16 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                {platform.name}
              </span>
            </div>
          ))}
        </div>
        {/* Second row - 4 icons on mobile, centered */}
        <div className="flex justify-center gap-3 sm:contents">
          {platforms.slice(5).map((platform, index) => (
            <div
              key={platform.name}
              className="group relative sm:mb-6"
              style={{ animationDelay: `${(index + 5) * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl shadow-sm group-hover:shadow-lg transform group-hover:-translate-y-1 transition-all duration-300 border border-gray-100">
                <span className="text-lg sm:text-xl font-bold text-gray-700 group-hover:text-gray-900">
                  {platform.icon}
                </span>
              </div>
              <span className="absolute top-14 sm:top-16 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                {platform.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
'use client'

export function ImpactSection() {
  return (
    <section className="relative bg-white pt-24 pb-12 px-4 overflow-hidden min-h-[600px] md:min-h-[500px]">
      {/* Purple gradient background under the curve - adjusted for mobile */}
      <div className="absolute inset-0 pointer-events-none">
        <svg 
          className="w-full h-full" 
          viewBox="0 0 1440 500" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {/* Mobile: Move curve lower, Desktop: Keep original */}
          <g className="block md:hidden">
            {/* Mobile curve - starts much lower */}
            <path 
              d="M0,500 C200,490 400,480 600,460 C800,440 1000,380 1200,300 C1320,250 1380,220 1440,200 L1440,500 L0,500 Z" 
              fill="url(#purpleGradientFillMobile)"
              opacity="1"
            />
            <path 
              d="M0,500 C200,490 400,480 600,460 C800,440 1000,380 1200,300 C1320,250 1380,220 1440,200" 
              stroke="url(#purpleGradientStrokeMobile)" 
              strokeWidth="2" 
              fill="none"
              opacity="0.3"
            />
          </g>
          <g className="hidden md:block">
            {/* Desktop curve - original */}
            <path 
              d="M0,500 C200,480 400,450 600,400 C800,350 1000,250 1200,100 C1320,25 1380,5 1440,0 L1440,500 L0,500 Z" 
              fill="url(#purpleGradientFill)"
              opacity="1"
            />
            <path 
              d="M0,500 C200,480 400,450 600,400 C800,350 1000,250 1200,100 C1320,25 1380,5 1440,0" 
              stroke="url(#purpleGradientStroke)" 
              strokeWidth="3" 
              fill="none"
              opacity="0.3"
            />
            {/* Dots on the curve - desktop only */}
            <circle cx="0" cy="500" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="300" cy="460" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="600" cy="400" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="900" cy="290" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="1200" cy="100" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="1440" cy="0" r="2" fill="#9333ea" opacity="0.8" />
          </g>
          <defs>
            <linearGradient id="purpleGradientFill" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f3e8ff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#e9d5ff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f3e8ff" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="purpleGradientStroke" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9333ea" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="purpleGradientFillMobile" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f3e8ff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#e9d5ff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f3e8ff" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="purpleGradientStrokeMobile" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9333ea" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0.5" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Content above the curve - with more padding on mobile */}
      <div className="container mx-auto max-w-6xl relative z-10 pb-48 md:pb-32">
        <div className="text-left mb-6">
          <h2 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
            What&apos;s the SocialCal impact?
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl">
            <span className="block sm:inline">SocialCal will save your team hours of work</span>
            <span className="block sm:inline"> (and lots of headaches) every week</span>
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-0 max-w-3xl">
          {/* Save Time Metric */}
          <div className="flex flex-col items-start px-4 py-6 sm:py-4 md:border-r border-gray-200 border-b md:border-b-0">
            <div className="mb-3">
              <span className="text-5xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">15x</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Save time</h3>
            <p className="text-gray-600 text-sm sm:text-xs leading-relaxed">
              Create and schedule your social media <br className="hidden sm:inline" />
              content 15x faster.
            </p>
          </div>

          {/* Get Answers Faster Metric */}
          <div className="flex flex-col items-start px-4 py-6 sm:py-4 md:border-r border-gray-200 border-b md:border-b-0">
            <div className="mb-3">
              <span className="text-5xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">67%</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Get answers faster</h3>
            <p className="text-gray-600 text-sm sm:text-xs leading-relaxed">
              Find and manage all your posts <br className="hidden sm:inline" />
              67% faster.
            </p>
          </div>

          {/* Increase Productivity Metric */}
          <div className="flex flex-col items-start px-4 py-6 sm:py-4">
            <div className="mb-3">
              <span className="text-5xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">25%</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Boost productivity</h3>
            <p className="text-gray-600 text-sm sm:text-xs leading-relaxed">
              Increase your productivity <br className="hidden sm:inline" />
              by 25%
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
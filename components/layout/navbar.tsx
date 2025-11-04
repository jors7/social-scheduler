'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BarChart, ChevronDown, Share2, Calendar, Sparkles, FolderOpen, FileText, Eye, Zap, CalendarDays } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef } from 'react'

interface NavbarProps {
  isAuthenticated: boolean | null
  userEmail: string | null
  onSignInClick?: () => void
  onMobileMenuClick?: () => void
  isMobileMenuOpen?: boolean
}

const platforms = [
  {
    name: 'X (Twitter)',
    description: 'Schedule tweets & posts',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    iconColor: 'text-black'
  },
  {
    name: 'Instagram',
    description: 'Share feeds, reels & stories',
    icon: (
      <svg viewBox="0 0 24 24" fill="url(#instagram-gradient)" className="w-6 h-6">
        <defs>
          <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#833AB4" />
            <stop offset="50%" stopColor="#F56040" />
            <stop offset="100%" stopColor="#FCAF45" />
          </linearGradient>
        </defs>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
      </svg>
    ),
    iconColor: ''
  },
  {
    name: 'Facebook',
    description: 'Schedule posts, reels, and stories',
    icon: (
      <svg viewBox="0 0 24 24" fill="#1877F2" className="w-6 h-6">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    iconColor: ''
  },
  {
    name: 'LinkedIn',
    description: 'Post and schedule to profiles',
    icon: (
      <svg viewBox="0 0 24 24" fill="#0A66C2" className="w-6 h-6">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    iconColor: ''
  },
  {
    name: 'YouTube',
    description: 'Schedule long-form videos and Shorts',
    icon: (
      <svg viewBox="0 0 24 24" fill="#FF0000" className="w-6 h-6">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    iconColor: ''
  },
  {
    name: 'TikTok',
    description: 'Plan and publish videos & photos/carousels',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    iconColor: 'text-black'
  },
  {
    name: 'Threads',
    description: 'Schedule posts and threads',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/>
      </svg>
    ),
    iconColor: 'text-black'
  },
  {
    name: 'Bluesky',
    description: 'Post text, images & links',
    icon: (
      <svg viewBox="0 0 24 24" fill="#00A8E8" className="w-6 h-6">
        <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/>
      </svg>
    ),
    iconColor: ''
  },
  {
    name: 'Pinterest',
    description: 'Schedule Pins, Video Pins & Carousels',
    icon: (
      <svg viewBox="0 0 24 24" fill="#E60023" className="w-6 h-6">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
      </svg>
    ),
    iconColor: ''
  }
]

const features = [
  {
    name: 'Multi-Platform',
    description: 'Post to 9+ platforms with one click',
    icon: Share2,
    iconColor: 'text-purple-600'
  },
  {
    name: 'Smart Scheduling',
    description: 'Schedule posts for optimal engagement',
    icon: Calendar,
    iconColor: 'text-blue-600'
  },
  {
    name: 'AI Caption Writer',
    description: 'Generate captions in multiple tones',
    icon: Sparkles,
    iconColor: 'text-amber-500'
  },
  {
    name: 'Analytics Dashboard',
    description: 'Track performance across all platforms',
    icon: BarChart,
    iconColor: 'text-green-600'
  },
  {
    name: 'Content Library',
    description: 'Organize media assets and templates',
    icon: FolderOpen,
    iconColor: 'text-orange-600'
  },
  {
    name: 'Draft Management',
    description: 'Save and perfect ideas over time',
    icon: FileText,
    iconColor: 'text-slate-600'
  },
  {
    name: 'Preview',
    description: 'Preview content before publishing',
    icon: Eye,
    iconColor: 'text-indigo-600'
  },
  {
    name: 'Automated Posting',
    description: 'Reliable background post processing',
    icon: Zap,
    iconColor: 'text-yellow-600'
  },
  {
    name: 'Drag & Drop Calendar',
    description: 'Visual calendar with drag & drop scheduling',
    icon: CalendarDays,
    iconColor: 'text-pink-600'
  }
]

export function Navbar({
  isAuthenticated,
  userEmail,
  onSignInClick,
  onMobileMenuClick,
  isMobileMenuOpen = false
}: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  const [showPlatformsDropdown, setShowPlatformsDropdown] = useState(false)
  const [showFeaturesDropdown, setShowFeaturesDropdown] = useState(false)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const featuresCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleNavClick = (sectionId: string) => {
    if (isHomepage) {
      // If on homepage, just scroll to the section
      const element = document.getElementById(sectionId)
      if (element) {
        const headerOffset = 80
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = elementPosition - headerOffset
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    } else {
      // If on another page, navigate to homepage with scroll parameter (like FAQ does)
      router.push(`/?scroll=${sectionId}`)
    }
  }

  const handlePlatformsMouseEnter = () => {
    // Clear any pending close timeout for platforms
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    // Immediately close features dropdown and clear its timeout
    if (featuresCloseTimeoutRef.current) {
      clearTimeout(featuresCloseTimeoutRef.current)
      featuresCloseTimeoutRef.current = null
    }
    setShowFeaturesDropdown(false)
    setShowPlatformsDropdown(true)
  }

  const handlePlatformsMouseLeave = () => {
    // Set a delay before closing
    closeTimeoutRef.current = setTimeout(() => {
      setShowPlatformsDropdown(false)
    }, 250) // 250ms delay
  }

  const handleFeaturesMouseEnter = () => {
    // Clear any pending close timeout for features
    if (featuresCloseTimeoutRef.current) {
      clearTimeout(featuresCloseTimeoutRef.current)
      featuresCloseTimeoutRef.current = null
    }
    // Immediately close platforms dropdown and clear its timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setShowPlatformsDropdown(false)
    setShowFeaturesDropdown(true)
  }

  const handleFeaturesMouseLeave = () => {
    // Set a delay before closing
    featuresCloseTimeoutRef.current = setTimeout(() => {
      setShowFeaturesDropdown(false)
    }, 250) // 250ms delay
  }

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-white backdrop-blur-lg border-b border-gray-200 shadow-lg">
      <div className="container mx-auto px-6">
        <nav className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp" 
              alt="SocialCal Logo" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <span 
              className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent"
              style={{ 
                fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                fontWeight: 800 
              }}
            >
              SocialCal
            </span>
          </Link>
          <div className="flex items-center space-x-8">
            <div className="hidden md:flex items-center space-x-8">
              <div
                className="relative"
                onMouseEnter={handleFeaturesMouseEnter}
                onMouseLeave={handleFeaturesMouseLeave}
              >
                <button
                  onClick={() => handleNavClick('features')}
                  className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200 flex items-center gap-1"
                  style={{
                    fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}
                >
                  Features
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${showFeaturesDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Features Dropdown Menu */}
                {showFeaturesDropdown && (
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[750px] bg-white rounded-lg shadow-xl border border-gray-200 p-6 z-50"
                    onMouseEnter={handleFeaturesMouseEnter}
                    onMouseLeave={handleFeaturesMouseLeave}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      {features.map((feature) => {
                        const IconComponent = feature.icon
                        return (
                          <div
                            key={feature.name}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors duration-200 cursor-pointer"
                          >
                            <div className={`flex-shrink-0 ${feature.iconColor}`}>
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 mb-0.5">
                                {feature.name}
                              </p>
                              <p className="text-[13px] text-gray-600 leading-tight">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div
                className="relative"
                onMouseEnter={handlePlatformsMouseEnter}
                onMouseLeave={handlePlatformsMouseLeave}
              >
                <button
                  onClick={() => handleNavClick('platforms')}
                  className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200 flex items-center gap-1"
                  style={{
                    fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}
                >
                  Platforms
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${showPlatformsDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {showPlatformsDropdown && (
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[750px] bg-white rounded-lg shadow-xl border border-gray-200 p-6 z-50"
                    onMouseEnter={handlePlatformsMouseEnter}
                    onMouseLeave={handlePlatformsMouseLeave}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      {platforms.map((platform) => (
                        <div
                          key={platform.name}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors duration-200 cursor-pointer"
                        >
                          <div className={`flex-shrink-0 ${platform.iconColor}`}>
                            {platform.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 mb-0.5">
                              {platform.name}
                            </p>
                            <p className="text-[13px] text-gray-600 leading-tight">
                              {platform.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Link 
                href="/pricing" 
                className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                style={{ 
                  fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                }}
              >
                Pricing
              </Link>
              <Link 
                href="/pricing?scroll=faq"
                className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                style={{ 
                  fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                }}
              >
                FAQ
              </Link>
            </div>
            {/* Desktop buttons - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated === null ? (
                <div className="w-48 h-10" />
              ) : isAuthenticated ? (
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="border border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    onClick={onSignInClick}
                    className="text-base font-medium border border-blue-500 text-blue-500 hover:bg-blue-50 transition-all duration-200 px-6 py-2"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => router.push('/pricing')}
                    className="text-base font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 px-6 py-2"
                  >
                    Start Free Trial
                  </Button>
                </>
              )}
            </div>
            <button 
              className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors mobile-menu-button"
              onClick={onMobileMenuClick}
            >
              <div className="flex flex-col gap-1.5">
                <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
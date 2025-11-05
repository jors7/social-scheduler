'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  Share2,
  Sparkles,
  Eye,
  PlayCircle
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const R2_PUBLIC_URL = 'https://pub-28b072a941304b078ab14462b82dc973.r2.dev'

const capabilities = [
  {
    id: 'multi-platform',
    icon: Share2,
    title: 'Multi-Platform Publishing',
    shortTitle: 'Multi-Platform',
    description: 'Post to 9+ platforms with one click — Instagram, LinkedIn, TikTok, YouTube, and more.',
    longDescription: 'Save hours every week. Create once, publish everywhere. No need to log into multiple apps or copy-paste the same content over and over.',
    color: 'from-purple-500 to-pink-500',
    iconColor: 'text-purple-500',
    image: '/Clean UX.webp',
    video: `${R2_PUBLIC_URL}/Multi-Platform.mp4`
  },
  {
    id: 'ai-captions',
    icon: Sparkles,
    title: 'AI Caption Writer',
    shortTitle: 'AI Captions',
    description: 'Generate engaging captions in seconds with AI — choose from Professional, Casual, Funny, or Inspirational tones.',
    longDescription: 'Never stare at a blank screen again. Our AI suggests platform-optimized captions instantly, so you can focus on creating great content instead of writing copy.',
    color: 'from-amber-500 to-yellow-500',
    iconColor: 'text-amber-500',
    image: '/Cross-Platform.webp',
    video: `${R2_PUBLIC_URL}/AI-Captions.mp4`
  },
  {
    id: 'calendar',
    icon: Calendar,
    title: 'Drag-and-Drop Calendar',
    shortTitle: 'Drag-and-Drop',
    description: 'See your entire content month at a glance. Move things around. Stay consistent with zero chaos.',
    longDescription: 'Easily fill content gaps, avoid last-minute stress, and keep your social presence on track — visually and intuitively.',
    color: 'from-green-500 to-emerald-500',
    iconColor: 'text-emerald-500',
    image: '/Drag-and-Drop.webp',
    video: `${R2_PUBLIC_URL}/Drag-and-drop.mp4`
  },
  {
    id: 'analytics',
    icon: TrendingUp,
    title: 'Powerful Analytics Dashboard',
    shortTitle: 'Analytics',
    description: 'Track performance across all platforms in one unified dashboard. See what\'s working, when your audience is most active, and which content drives engagement.',
    longDescription: 'Get actionable insights with detailed metrics for reach, engagement, follower growth, and post performance — all visualized beautifully so you can make data-driven decisions fast.',
    color: 'from-indigo-500 to-purple-500',
    iconColor: 'text-indigo-500',
    image: '/Analytics.webp',
    video: `${R2_PUBLIC_URL}/Analytics.mp4`
  },
  {
    id: 'preview',
    icon: Eye,
    title: 'Content Preview',
    shortTitle: 'Preview',
    description: 'See exactly how your posts look before publishing — preview for each platform to ensure perfection.',
    longDescription: 'No more posting mistakes or formatting surprises. Preview your content exactly as your audience will see it across every platform before you hit publish.',
    color: 'from-red-500 to-rose-500',
    iconColor: 'text-red-500',
    image: '/Customization.webp',
    video: `${R2_PUBLIC_URL}/Preview.mp4`
  }
]

// Demo Player Component with lazy loading
function DemoPlayer({ capability }: { capability: typeof capabilities[0] }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [posterReady, setPosterReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const posterVideoRef = useRef<HTMLVideoElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current)
      }
    }
  }, [])

  // Handle play button click
  const handlePlayClick = async () => {
    setIsPlaying(true)
    // Small delay to ensure video element is mounted
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch((error) => {
          console.error('Error playing video:', error)
          setIsPlaying(false)
        })
      }
    }, 100)
  }

  // Handle close button click
  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    console.log('Close button clicked') // Debug log
    // Stop the video
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setVideoLoaded(false)
  }

  // Load first frame when video is in view
  useEffect(() => {
    if (isInView && posterVideoRef.current && !isPlaying) {
      const video = posterVideoRef.current
      
      const handleLoadedMetadata = () => {
        // Just show the first frame, don't try to play
        if (video) {
          video.currentTime = 0.01
          setPosterReady(true)
        }
      }
      
      // Single event listener for metadata
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      
      return () => {
        if (video) {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }
      }
    }
  }, [isInView, capability.id, isPlaying])

  // Reset when capability changes
  useEffect(() => {
    setIsPlaying(false)
    setVideoLoaded(false)
    setPosterReady(false)
    // Force poster video to reload with new source
    if (posterVideoRef.current) {
      posterVideoRef.current.load()
    }
  }, [capability.id])

  return (
    <div ref={containerRef} className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl bg-black">
      {!isPlaying ? (
        // Show video poster with play button overlay
        <div className="relative w-full h-full group cursor-pointer" onClick={handlePlayClick}>
          {/* Loading state with gradient background */}
          {!posterReady && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-gray-700/50"></div>
                </div>
              </div>
            </div>
          )}
          
          {isInView && (
            <video
              ref={posterVideoRef}
              key={capability.id} // Force re-render when capability changes
              className={cn(
                "w-full h-full object-cover transition-opacity duration-500",
                posterReady ? "opacity-100" : "opacity-0"
              )}
              muted
              playsInline
              preload="metadata" // Only load metadata for poster frame
              {...{ 'webkit-playsinline': 'true' }} // iOS specific attribute
            >
              <source src={capability.video} type="video/mp4" />
            </video>
          )}
          {/* Dark overlay with play button */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent transition-opacity duration-300 flex items-center justify-center">
            <div className="transform transition-all group-hover:scale-110 duration-300">
              <div className="relative">
                {/* Shadow underneath */}
                <div className="absolute inset-0 translate-y-2 bg-black/20 rounded-full blur-2xl"></div>
                {/* Main play button with gradient */}
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 via-blue-500 to-cyan-400 p-[2px] shadow-2xl">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 via-blue-600 to-cyan-500 flex items-center justify-center">
                    <svg 
                      className="h-8 w-8 text-white ml-1" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/30 via-blue-500/30 to-cyan-400/30 blur-xl scale-125 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Show video when playing
        <>
          <div className="relative w-full h-full bg-black">
            <video
              ref={videoRef}
              key={`playing-${capability.id}`} // Force re-render with new key
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload="auto" // Full preload only when playing
              onLoadedData={() => setVideoLoaded(true)}
              onError={(e) => {
                console.error('Video failed to load:', e)
                setIsPlaying(false)
              }}
            >
              <source src={capability.video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            {/* Loading spinner while video loads */}
            {!videoLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          {/* Close button - placed outside video container for better z-index control */}
          <button
            type="button"
            onClick={handleCloseClick}
            className="absolute top-4 right-4 z-[100] bg-black/50 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/70 transition-all duration-200 border border-white/30 cursor-pointer"
            style={{ zIndex: 100 }}
            aria-label="Stop video"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

export function CapabilitiesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handlePrevious = () => {
    setCurrentIndex(prev => prev === 0 ? capabilities.length - 1 : prev - 1)
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % capabilities.length)
  }

  const handleDotClick = (index: number) => {
    setCurrentIndex(index)
  }

  const currentCapability = capabilities[currentIndex]

  return (
    <section className="pt-12 pb-20 px-4 bg-gradient-to-b from-gray-50 to-white overflow-x-hidden">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Smart Scheduling. Streamlined Features.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Everything you need to schedule, organize, and repurpose your content — built for simplicity, speed, and results
          </p>
          
          {/* Capability Navigation Buttons - Mobile optimized */}
          <div className="mb-16">
            {/* Mobile: Compact grid layout */}
            <div className="md:hidden">
              <div className="flex flex-wrap justify-center gap-3">
                {capabilities.map((capability, idx) => (
                  <button
                    key={capability.id}
                    onClick={() => handleDotClick(idx)}
                    className={cn(
                      "group relative px-3 py-2 transition-all flex-shrink-0",
                      currentIndex === idx
                        ? "scale-110"
                        : "opacity-70 hover:opacity-100"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <capability.icon className={cn(
                        "h-6 w-6 transition-all",
                        capability.iconColor,
                        currentIndex === idx 
                          ? "opacity-100" 
                          : "opacity-50 group-hover:opacity-100"
                      )} />
                      <span className={cn(
                        "text-xs font-medium transition-colors",
                        currentIndex === idx
                          ? "text-gray-900"
                          : "text-gray-500 group-hover:text-gray-700"
                      )}>
                        {capability.shortTitle}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop: Centered flex */}
            <div className="hidden md:flex flex-wrap justify-center gap-10">
              {capabilities.map((capability, idx) => (
                <button
                  key={capability.id}
                  onClick={() => handleDotClick(idx)}
                  className={cn(
                    "group relative px-4 py-2.5 transition-all",
                    currentIndex === idx
                      ? "scale-105"
                      : "opacity-75 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <capability.icon className={cn(
                      "h-7 w-7 transition-all",
                      capability.iconColor,
                      currentIndex === idx 
                        ? "opacity-100" 
                        : "opacity-60 group-hover:opacity-100"
                    )} />
                    <span 
                      className={cn(
                        "text-[18px] tracking-wide transition-colors",
                        currentIndex === idx
                          ? "text-gray-900 font-semibold"
                          : "text-gray-600 group-hover:text-gray-800"
                      )}
                      style={{ 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        letterSpacing: '0.3px'
                      }}
                    >
                      {capability.shortTitle}
                    </span>
                  </div>
                  {/* Beautiful underline for selected item */}
                  <div 
                    className={cn(
                      "absolute -bottom-1 left-0 right-0 h-0.5 transition-all duration-300",
                      currentIndex === idx ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                      background: currentIndex === idx 
                        ? `linear-gradient(90deg, transparent, ${
                            capability.iconColor === 'text-blue-500' ? '#3b82f6' :
                            capability.iconColor === 'text-purple-500' ? '#a855f7' :
                            capability.iconColor === 'text-emerald-500' ? '#10b981' :
                            capability.iconColor === 'text-indigo-500' ? '#6366f1' :
                            capability.iconColor === 'text-rose-500' ? '#f43f5e' : '#3b82f6'
                          }, transparent)` 
                        : ''
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Desktop Navigation Buttons - absolute positioning */}
          <button
            type="button"
            onClick={handlePrevious}
            className="hidden md:block absolute -left-16 lg:-left-20 top-1/2 -translate-y-1/2 z-30 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow hover:scale-110 active:scale-95"
            aria-label="Previous capability"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="hidden md:block absolute -right-16 lg:-right-20 top-1/2 -translate-y-1/2 z-30 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow hover:scale-110 active:scale-95"
            aria-label="Next capability"
          >
            <ChevronRight className="h-6 w-6 text-gray-700" />
          </button>

          {/* Main Content - Different layouts for mobile and desktop */}
          <div className="max-w-6xl mx-auto">
            {/* Mobile Layout - Stacked with navigation in middle */}
            <div className="md:hidden space-y-6">
              {/* Text Content */}
              <div className="space-y-4 transition-all duration-500 ease-in-out px-4" key={`mobile-content-${currentIndex}`}>
                <h3 className="text-2xl font-bold">
                  {currentCapability.title}
                </h3>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {currentCapability.description}
                  </p>
                  
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {currentCapability.longDescription}
                  </p>
                </div>
              </div>

              {/* Mobile Navigation Buttons - In their own row */}
              <div className="flex justify-center items-center gap-8 py-4">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow hover:scale-110 active:scale-95"
                  aria-label="Previous capability"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    {currentIndex + 1} / {capabilities.length}
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow hover:scale-110 active:scale-95"
                  aria-label="Next capability"
                >
                  <ChevronRight className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative px-4">
                <DemoPlayer capability={currentCapability} />
              </div>
            </div>

            {/* Desktop Layout - Side by side */}
            <div className="hidden md:grid lg:grid-cols-2 gap-8 items-center">
              {/* Left Side - Text Content */}
              <div className="space-y-6 transition-all duration-500 ease-in-out" key={`desktop-content-${currentIndex}`}>
                <h3 className="text-3xl md:text-4xl font-bold">
                  {currentCapability.title}
                </h3>
                
                <div className="space-y-4">
                  <p className="text-base text-gray-600 leading-relaxed">
                    {currentCapability.description}
                  </p>
                  
                  <p className="text-base text-gray-600 leading-relaxed">
                    {currentCapability.longDescription}
                  </p>
                </div>
              </div>

              {/* Right Side - Visual with Demo Player */}
              <div className="relative">
                {/* Decorative background shapes - hidden on mobile to prevent overflow */}
                {/* Top left blue rounded shape */}
                <div className="hidden lg:block absolute -top-12 -left-12 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-cyan-400/10 rounded-[100px] blur-2xl" />

                {/* Bottom right purple rounded shape */}
                <div className="hidden lg:block absolute -bottom-16 -right-16 w-72 h-72 bg-gradient-to-tl from-purple-400/20 to-pink-400/10 rounded-[120px] blur-2xl" />

                {/* Additional accent shapes */}
                <div className="hidden lg:block absolute top-1/2 -left-8 w-32 h-32 bg-gradient-to-r from-indigo-400/15 to-blue-400/15 rounded-full blur-xl" />
                <div className="hidden lg:block absolute -top-8 right-1/3 w-24 h-24 bg-gradient-to-b from-cyan-400/15 to-teal-400/15 rounded-full blur-xl" />

                {/* Demo Player */}
                <div className="relative z-10">
                  <DemoPlayer capability={currentCapability} />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Dots only - removed duplicate capability tabs */}
          <div className="flex justify-center gap-2 mt-16">
            {capabilities.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentIndex === idx
                    ? "bg-gray-600"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
                aria-label={`Go to capability ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
export default CapabilitiesCarousel

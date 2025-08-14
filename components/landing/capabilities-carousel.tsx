'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  TrendingUp,
  Globe,
  Target,
  Palette
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const capabilities = [
  {
    id: 'cross-platform',
    icon: Globe,
    title: 'Cross-Platform Scheduling',
    shortTitle: 'Cross-Platform',
    description: 'Plan and schedule once — post across Instagram, LinkedIn, TikTok, Threads, YouTube, and more.',
    longDescription: 'All in one simple dashboard. No need to jump between tabs or tools — just create, schedule, and let your content go live everywhere from one place.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'customization',
    icon: Palette,
    title: 'Flexible Post Customization',
    shortTitle: 'Customization',
    description: 'Tweak your content per platform so everything sounds native — not copied and pasted.',
    longDescription: 'Adjust captions, hashtags, visuals, and tone for each channel to make sure your content feels tailored, not generic.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'calendar',
    icon: Calendar,
    title: 'Drag-and-Drop Calendar',
    shortTitle: 'Drag-and-Drop',
    description: 'See your entire content month at a glance. Move things around. Stay consistent with zero chaos.',
    longDescription: 'Easily fill content gaps, avoid last-minute stress, and keep your social presence on track — visually and intuitively.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'pricing',
    icon: TrendingUp,
    title: 'Low-Cost, High-Impact',
    shortTitle: 'Low-Cost',
    description: 'All the essential features at a fraction of the price of traditional schedulers. No paywalls, no bloat, no surprises.',
    longDescription: 'Whether you\'re a creator just starting out or a team with big ambitions, our pricing is built to scale with you — not against you.',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'ux',
    icon: Target,
    title: 'Clean, Creator-First UX',
    shortTitle: 'Clean UX',
    description: 'Built for speed and clarity — no overwhelming menus, no agency jargon. Just smooth workflows and tools that make sense.',
    longDescription: 'You\'ll never feel lost or buried under features you don\'t need. Just log in, get things done, and get back to creating.',
    color: 'from-pink-500 to-rose-500'
  }
]

export function CapabilitiesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % capabilities.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const handlePrevious = () => {
    setIsAutoPlaying(false)
    setCurrentIndex(prev => prev === 0 ? capabilities.length - 1 : prev - 1)
  }

  const handleNext = () => {
    setIsAutoPlaying(false)
    setCurrentIndex(prev => (prev + 1) % capabilities.length)
  }

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false)
    setCurrentIndex(index)
  }

  const currentCapability = capabilities[currentIndex]

  return (
    <section className="pt-16 pb-20 px-4 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Smart Scheduling. Streamlined Features.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Everything you need to schedule, organize, and repurpose your content — built for simplicity, speed, and results
          </p>
          
          {/* Capability Navigation Buttons - Moved under subheadline */}
          <div className="flex flex-wrap justify-center gap-8 mb-16">
            {capabilities.map((capability, idx) => (
              <button
                key={capability.id}
                onClick={() => handleDotClick(idx)}
                className={cn(
                  "group relative px-4 py-2.5 transition-all",
                  "hover:text-primary",
                  currentIndex === idx
                    ? "text-primary"
                    : "text-gray-600"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "p-1 rounded bg-gradient-to-br",
                    capability.color
                  )}>
                    <capability.icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span 
                    className="text-[18px] tracking-wide"
                    style={{ 
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      fontWeight: 500,
                      letterSpacing: '0.3px'
                    }}
                  >
                    {capability.shortTitle}
                  </span>
                </div>
                {/* Beautiful underline for selected item */}
                <div 
                  className={cn(
                    "absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0 transition-all duration-300",
                    currentIndex === idx ? "opacity-100" : "opacity-0"
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            type="button"
            onClick={handlePrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow hover:scale-110 active:scale-95"
            aria-label="Previous capability"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow hover:scale-110 active:scale-95"
            aria-label="Next capability"
          >
            <ChevronRight className="h-6 w-6 text-gray-700" />
          </button>

          {/* Main Content - Reduced width and centered */}
          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            {/* Left Side - Text Content */}
            <div className="space-y-6 transition-all duration-500 ease-in-out" key={`content-${currentIndex}`}>
              {/* Icon and Title */}
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-4 rounded-2xl bg-gradient-to-br transition-all duration-300",
                  currentCapability.color
                )}>
                  <currentCapability.icon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Capability {currentIndex + 1} of {capabilities.length}
                  </span>
                </div>
              </div>

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

            {/* Right Side - Visual with reduced height */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200">
                {/* Placeholder with reduced height */}
                <div className="aspect-[16/9] flex items-center justify-center">
                  <div className={cn(
                    "absolute inset-0 opacity-10 bg-gradient-to-br",
                    currentCapability.color
                  )} />
                  <div className="relative z-10 text-center p-8">
                    <currentCapability.icon className="h-24 w-24 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 text-lg font-medium">
                      {currentCapability.title} Preview
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Interactive demo coming soon
                    </p>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 h-24 w-24 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 h-32 w-32 bg-primary/10 rounded-full blur-3xl" />
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
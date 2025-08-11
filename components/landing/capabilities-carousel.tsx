'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  Users,
  Calendar,
  Zap,
  MessageSquare,
  TrendingUp,
  Globe,
  Shield,
  Clock,
  Target,
  Palette,
  BrainCircuit
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const capabilities = [
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Advanced Analytics & Reporting',
    description: 'Track performance across all platforms with detailed insights',
    features: [
      'Real-time engagement metrics',
      'Cross-platform analytics',
      'Custom report generation',
      'Performance predictions'
    ],
    image: '/images/analytics-dashboard.png',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'collaboration',
    icon: Users,
    title: 'Team Collaboration Hub',
    description: 'Work seamlessly with your team on content creation and approval',
    features: [
      'Role-based permissions',
      'Content approval workflows',
      'Team activity tracking',
      'Internal notes & comments'
    ],
    image: '/images/team-collaboration.png',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'scheduling',
    icon: Calendar,
    title: 'Smart Content Calendar',
    description: 'Visual calendar with drag-and-drop scheduling and optimal timing',
    features: [
      'Best time to post suggestions',
      'Bulk scheduling',
      'Content recycling',
      'Holiday calendar integration'
    ],
    image: '/images/content-calendar.png',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'automation',
    icon: Zap,
    title: 'Powerful Automation',
    description: 'Automate repetitive tasks and focus on strategy',
    features: [
      'Auto-publish from RSS feeds',
      'Content queue management',
      'Automated responses',
      'Workflow automation'
    ],
    image: '/images/automation.png',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'engagement',
    icon: MessageSquare,
    title: 'Unified Inbox',
    description: 'Manage all social conversations from one place',
    features: [
      'All messages in one inbox',
      'Quick reply templates',
      'Sentiment analysis',
      'Priority filtering'
    ],
    image: '/images/unified-inbox.png',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'ai-assistant',
    icon: BrainCircuit,
    title: 'AI Content Assistant',
    description: 'Generate engaging content with AI-powered suggestions',
    features: [
      'Smart caption generation',
      'Hashtag recommendations',
      'Content optimization tips',
      'Trending topics analysis'
    ],
    image: '/images/ai-assistant.png',
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
    <section className="pt-12 pb-20 px-4 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Enterprise-Grade Capabilities
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Designed for scaling marketing agencies and brands that demand excellence
          </p>
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

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center px-12">
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
              
              <p className="text-lg text-gray-600">
                {currentCapability.description}
              </p>

              {/* Features List */}
              <ul className="space-y-3">
                {currentCapability.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <div className="pt-4">
                <Button size="lg" className="group">
                  Explore {currentCapability.title}
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>

            {/* Right Side - Visual */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200">
                {/* Placeholder for actual screenshots */}
                <div className="aspect-[4/3] flex items-center justify-center">
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

          {/* Capability Tabs */}
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {capabilities.map((capability, idx) => (
              <button
                key={capability.id}
                onClick={() => handleDotClick(idx)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  "hover:bg-gray-100",
                  currentIndex === idx
                    ? "bg-primary text-white hover:bg-primary"
                    : "bg-white text-gray-600 border"
                )}
              >
                <capability.icon className="inline h-4 w-4 mr-2" />
                {capability.title.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {capabilities.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                className={cn(
                  "h-2 transition-all rounded-full",
                  currentIndex === idx
                    ? "w-8 bg-primary"
                    : "w-2 bg-gray-300 hover:bg-gray-400"
                )}
                aria-label={`Go to capability ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 bg-white rounded-2xl shadow-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">50K+</div>
            <div className="text-sm text-gray-600 mt-1">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">10M+</div>
            <div className="text-sm text-gray-600 mt-1">Posts Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">99.9%</div>
            <div className="text-sm text-gray-600 mt-1">Uptime SLA</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">24/7</div>
            <div className="text-sm text-gray-600 mt-1">Support Available</div>
          </div>
        </div>
      </div>
    </section>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Calendar,
  BarChart3,
  PlusCircle,
  Wand2,
  CheckCircle2,
  Rocket,
  Share2,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: any
  actionLabel?: string
  visualContent: React.ReactNode
}

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  onSkip: () => void
}

export function OnboardingWizard({ isOpen, onClose, onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)

  // Reset to first step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
    }
  }, [isOpen])

  // Visual card component for the right side
  const VisualCard = ({ icon: Icon, title, items, colors }: {
    icon: any,
    title: string,
    items: { label: string, color: string, width: string }[],
    colors: { bg: string, iconBg: string, iconColor: string }
  }) => (
    <div className={cn("rounded-2xl p-6 shadow-lg border border-gray-100", colors.bg)}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-2 text-sm font-medium text-gray-700">{title}</span>
      </div>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", item.color)} style={{ width: item.width }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to SocialCal',
      description: 'SocialCal helps you manage all your social media accounts in one place. Post to multiple platforms, schedule content, and track your performance.',
      icon: Sparkles,
      actionLabel: 'Get Started',
      visualContent: (
        <VisualCard
          icon={Sparkles}
          title="Dashboard Overview"
          items={[
            { label: 'Posts', color: 'bg-emerald-500', width: '85%' },
            { label: 'Engagement', color: 'bg-blue-500', width: '70%' },
            { label: 'Growth', color: 'bg-amber-500', width: '60%' },
          ]}
          colors={{ bg: 'bg-gradient-to-br from-emerald-50 to-white', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' }}
        />
      ),
    },
    {
      id: 'connect-accounts',
      title: 'Connect Your Accounts',
      description: 'Link your social media profiles to post across all platforms with a single click. We support Facebook, Instagram, Threads, Bluesky, and more.',
      icon: Users,
      actionLabel: 'Connect Accounts',
      visualContent: (
        <div className="rounded-2xl p-6 shadow-lg border border-gray-100 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-sm font-medium text-gray-700">Connected Accounts</span>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Facebook', color: 'bg-[#1877F2]', icon: 'f' },
              { name: 'Instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500', icon: '📷' },
              { name: 'Bluesky', color: 'bg-[#00A8E8]', icon: '🦋' },
            ].map((platform, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold", platform.color)}>
                  {platform.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'post-everywhere',
      title: 'Post Everywhere at Once',
      description: 'Write once, publish everywhere. Select multiple platforms and share your content across all of them with a single click - no more copying and pasting between apps.',
      icon: Share2,
      actionLabel: 'See How It Works',
      visualContent: (
        <div className="rounded-2xl p-6 shadow-lg border border-gray-100 bg-gradient-to-br from-indigo-50 to-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-sm font-medium text-gray-700">Select Platforms</span>
          </div>
          <div className="space-y-2">
            {[
              { name: 'Facebook', color: 'bg-[#1877F2]', icon: 'f', checked: true },
              { name: 'Instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500', icon: '📷', checked: true },
              { name: 'Threads', color: 'bg-black', icon: '@', checked: true },
              { name: 'Bluesky', color: 'bg-[#00A8E8]', icon: '🦋', checked: false },
            ].map((platform, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center",
                  platform.checked ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                )}>
                  {platform.checked && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className={cn("w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold", platform.color)}>
                  {platform.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{platform.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="text-xs text-center text-indigo-600 font-medium">3 platforms selected</div>
          </div>
        </div>
      ),
    },
    {
      id: 'create-post',
      title: 'Create Engaging Content',
      description: 'Use our powerful editor to craft beautiful posts. Add images, format text, and customize your message for each platform.',
      icon: PlusCircle,
      actionLabel: 'Create Post',
      visualContent: (
        <div className="rounded-2xl p-6 shadow-lg border border-gray-100 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-sm font-medium text-gray-700">Post Editor</span>
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mt-4" />
          </div>
        </div>
      ),
    },
    {
      id: 'ai-features',
      title: 'AI-Powered Captions',
      description: 'Let AI help you write engaging content. Generate captions in different tones - professional, casual, funny, or inspirational.',
      icon: Wand2,
      actionLabel: 'Try AI Captions',
      visualContent: (
        <div className="rounded-2xl p-6 shadow-lg border border-gray-100 bg-gradient-to-br from-violet-50 to-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-sm font-medium text-gray-700">AI Suggestions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['Professional', 'Casual', 'Funny', 'Inspirational'].map((tone, i) => (
              <div key={i} className={cn(
                "p-3 rounded-lg text-center text-xs font-medium",
                i === 0 ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300" : "bg-white border border-gray-200 text-gray-600"
              )}>
                {tone}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'schedule-posts',
      title: 'Schedule in Advance',
      description: 'Plan your content calendar and let posts go live automatically. Schedule for optimal engagement times, even when you are away.',
      icon: Calendar,
      actionLabel: 'View Calendar',
      visualContent: (
        <div className="rounded-2xl p-6 shadow-lg border border-gray-100 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-sm font-medium text-gray-700">Content Calendar</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs text-gray-400 font-medium pb-1">{day}</div>
            ))}
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} className={cn(
                "aspect-square rounded flex items-center justify-center text-xs",
                [2, 5, 8, 11].includes(i) ? "bg-green-500 text-white font-medium" : "bg-gray-100 text-gray-500"
              )}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'analytics',
      title: 'Track Performance',
      description: 'Monitor your engagement, reach, and growth across all platforms. Understand what content resonates with your audience.',
      icon: BarChart3,
      actionLabel: 'View Analytics',
      visualContent: (
        <VisualCard
          icon={BarChart3}
          title="Performance Metrics"
          items={[
            { label: 'Reach', color: 'bg-purple-500', width: '90%' },
            { label: 'Engagement', color: 'bg-blue-500', width: '75%' },
            { label: 'Followers', color: 'bg-orange-500', width: '65%' },
          ]}
          colors={{ bg: 'bg-gradient-to-br from-orange-50 to-white', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' }}
        />
      ),
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'You now know the basics of SocialCal. Start by connecting your accounts and creating your first post. Let\'s grow your social presence!',
      icon: Rocket,
      actionLabel: 'Start Creating',
      visualContent: (
        <div className="rounded-2xl p-6 shadow-lg border border-gray-100 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-sm font-medium text-gray-700">Quick Start</span>
          </div>
          <div className="space-y-3">
            {[
              { icon: Users, label: 'Connect accounts', color: 'text-purple-600 bg-purple-100' },
              { icon: PlusCircle, label: 'Create first post', color: 'text-blue-600 bg-blue-100' },
              { icon: Calendar, label: 'Schedule content', color: 'text-green-600 bg-green-100' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", item.color)}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100
  const isLastStep = currentStep === steps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const handleSkip = () => {
    onSkip()
  }

  const isFirstStep = currentStep === 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 border-0 [&>button]:hidden overflow-y-auto">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 px-6 md:px-8 py-5 md:py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Mobile Header */}
          <h2 className="text-xl font-bold text-white mb-1 md:hidden">
            Welcome!
          </h2>

          {/* Desktop Header */}
          <h2 className="text-xl font-bold text-white mb-1 hidden md:block">
            Master Your Social Media Workflow
          </h2>
          <p className="text-white/80 text-sm hidden md:block">
            Plan, schedule, manage, and analyze your social media posts
          </p>

          {/* Progress Section */}
          <div className="mt-4 md:mt-5">
            <div className="flex items-center justify-between text-sm text-white/80 mb-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 md:p-8 bg-white">
            <div className="flex flex-col md:flex-row gap-5 md:gap-8 items-center">
              {/* Left Side - Text Content */}
              <div className="flex-1 space-y-3 md:space-y-4 w-full">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                  {currentStepData.title}
                </h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                  {currentStepData.description}
                </p>
                <Button
                  onClick={handleNext}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 mt-2 w-full md:w-auto"
                >
                  <currentStepData.icon className="h-4 w-4" />
                  {currentStepData.actionLabel}
                </Button>
              </div>

              {/* Right Side - Visual */}
              <div className="flex-1 w-full max-w-[280px] md:max-w-none mx-auto md:mx-0">
                {currentStepData.visualContent}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 md:px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isFirstStep && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900 gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip Tour
            </button>
          </div>
          <Button
            onClick={handleNext}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          >
            {isLastStep ? 'Get Started' : 'Next Step'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

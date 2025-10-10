'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: any
  content: React.ReactNode
  targetElement?: string // CSS selector for spotlight
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right'
}

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  onSkip: () => void
}

export function OnboardingWizard({ isOpen, onClose, onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to SocialCal! 🎉',
      description: "Let's take a quick tour of your new social media command center",
      icon: Sparkles,
      position: 'center',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            SocialCal helps you manage all your social media accounts in one place.
            Post to multiple platforms, schedule content, and track your performance.
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-900 font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              This quick tour will show you everything you need to get started
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Multi-platform posting</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>AI-powered captions</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Content scheduling</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Analytics & insights</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'connect-accounts',
      title: 'Connect Your Social Accounts',
      description: 'Link your social media profiles to start posting',
      icon: Users,
      position: 'center',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Connect your social media accounts to post across all platforms with one click.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center text-white font-bold">
                f
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Facebook Pages</p>
                <p className="text-xs text-gray-500">Post to your business page</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
                📷
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Instagram</p>
                <p className="text-xs text-gray-500">Share photos and stories</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white">
                @
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Threads</p>
                <p className="text-xs text-gray-500">Join the conversation</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-10 h-10 bg-[#00A8E8] rounded-lg flex items-center justify-center text-white">
                🦋
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Bluesky</p>
                <p className="text-xs text-gray-500">Decentralized social network</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              💡 You can connect accounts anytime from Settings → Social Accounts
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'create-post',
      title: 'Create Your First Post',
      description: 'Compose and publish content across all your platforms',
      icon: PlusCircle,
      position: 'center',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Our powerful editor makes it easy to create engaging content for all your social media accounts.
          </p>
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-purple-600" />
              What you can do:
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span><strong>Rich text editing:</strong> Format your content with bold, italic, links, and more</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span><strong>Upload media:</strong> Add images and videos to your posts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span><strong>Platform-specific content:</strong> Customize your message for each platform</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span><strong>Save as draft:</strong> Come back to finish your post later</span>
              </li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-900 flex items-center gap-2">
              <ArrowRight className="h-3 w-3" />
              Click &quot;Create Post&quot; in the top section to get started!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'ai-features',
      title: 'AI-Powered Caption Suggestions',
      description: 'Let AI help you write engaging content',
      icon: Wand2,
      position: 'center',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Stuck on what to write? Our AI can generate engaging captions for you in seconds.
          </p>
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-4 border border-purple-300">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-sm">Choose your tone:</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/80 rounded p-2 text-center">
                <p className="text-xs font-medium">🎯 Professional</p>
              </div>
              <div className="bg-white/80 rounded p-2 text-center">
                <p className="text-xs font-medium">😊 Casual</p>
              </div>
              <div className="bg-white/80 rounded p-2 text-center">
                <p className="text-xs font-medium">😂 Funny</p>
              </div>
              <div className="bg-white/80 rounded p-2 text-center">
                <p className="text-xs font-medium">✨ Inspirational</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>AI analyzes your content and generates platform-optimized captions</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Automatically suggests relevant hashtags</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Edit and customize the suggestions to match your voice</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'schedule-posts',
      title: 'Schedule Posts in Advance',
      description: 'Plan your content calendar and post automatically',
      icon: Calendar,
      position: 'center',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Schedule your posts to go live at the perfect time, even when you&apos;re away.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-sm">Scheduling Features:</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">📅</span>
                <span><strong>Calendar view:</strong> Visualize your content pipeline</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">⏰</span>
                <span><strong>Optimal timing:</strong> Schedule for peak engagement hours</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">🔄</span>
                <span><strong>Recurring posts:</strong> Set up repeating content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">📊</span>
                <span><strong>Batch scheduling:</strong> Plan weeks of content in one session</span>
              </li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              💡 Pro tip: Post during 9-10 AM or 7-9 PM for maximum engagement!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'analytics',
      title: 'Track Your Performance',
      description: 'Monitor engagement and grow your audience',
      icon: BarChart3,
      position: 'center',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Understand what&apos;s working with detailed analytics and insights across all your platforms.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="text-2xl font-bold text-purple-600 mb-1">2.3K</div>
              <div className="text-xs text-gray-600">Total Reach</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600 mb-1">8.5%</div>
              <div className="text-xs text-gray-600">Engagement Rate</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="text-2xl font-bold text-green-600 mb-1">156</div>
              <div className="text-xs text-gray-600">Total Posts</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="text-2xl font-bold text-orange-600 mb-1">42</div>
              <div className="text-xs text-gray-600">Scheduled</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Real-time data from all connected platforms</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Track likes, comments, shares, and impressions</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Identify your best-performing content</span>
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-900 flex items-center gap-2">
              <BarChart3 className="h-3 w-3" />
              Visit Analytics page to see detailed performance metrics
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'complete',
      title: 'You&apos;re All Set! 🚀',
      description: 'Start creating amazing content for your audience',
      icon: CheckCircle2,
      position: 'center',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            You now know the basics of SocialCal. Time to start creating and growing your social media presence!
          </p>
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <h4 className="font-bold text-lg mb-4 text-center">Quick Start Checklist</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium">Connect your social accounts</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <PlusCircle className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium">Create your first post</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium">Schedule content for the week</span>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <p className="text-sm text-purple-900 font-medium mb-2">
              Need help? You can restart this tour anytime!
            </p>
            <p className="text-xs text-purple-700">
              Click the &quot;Tour&quot; button at the top of your dashboard
            </p>
          </div>
        </div>
      ),
    },
  ]

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setDirection('forward')
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  const handleBack = () => {
    setDirection('backward')
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const handleSkip = () => {
    onSkip()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
                  <currentStepData.icon className="h-6 w-6 text-purple-600" />
                </div>
                <Badge variant="outline" className="text-xs">
                  Step {currentStep + 1} of {steps.length}
                </Badge>
              </div>
              <DialogTitle className="text-2xl mb-2">{currentStepData.title}</DialogTitle>
              <DialogDescription className="text-base">
                {currentStepData.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{currentStep + 1} of {steps.length} completed</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Content */}
        <div className="py-4">
          {currentStepData.content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep}
            className={cn(
              "gap-2",
              isFirstStep && "invisible"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip tour
            </Button>
            <Button
              variant="gradient"
              onClick={handleNext}
              className="gap-2 min-w-[120px]"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <CheckCircle2 className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 pt-4">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => {
                setDirection(index > currentStep ? 'forward' : 'backward')
                setCurrentStep(index)
              }}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentStep
                  ? "w-8 bg-purple-600"
                  : index < currentStep
                  ? "w-2 bg-green-500"
                  : "w-2 bg-gray-300"
              )}
              aria-label={`Go to step ${index + 1}: ${step.title}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

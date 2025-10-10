'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'

interface OnboardingContextType {
  isOnboardingOpen: boolean
  hasCompletedOnboarding: boolean
  isLoading: boolean
  startOnboarding: () => void
  completeOnboarding: () => void
  skipOnboarding: () => void
  closeOnboarding: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

const ONBOARDING_STORAGE_KEY = 'socialcal_onboarding_completed'
const ONBOARDING_SKIP_KEY = 'socialcal_onboarding_skipped'

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch onboarding status from API
  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/user/onboarding')

        if (response.ok) {
          const data = await response.json()
          const completed = data.onboarding_completed || data.onboarding_skipped
          setHasCompletedOnboarding(completed)

          // Also update localStorage
          if (completed) {
            localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
          }
        } else if (response.status === 401) {
          // User not authenticated, check localStorage only
          const localCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
          setHasCompletedOnboarding(localCompleted)
        }
      } catch (error) {
        console.error('Error fetching onboarding status:', error)
        // Fallback to localStorage
        const localCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
        setHasCompletedOnboarding(localCompleted)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOnboardingStatus()
  }, [])

  const startOnboarding = () => {
    setIsOnboardingOpen(true)
  }

  const completeOnboarding = async () => {
    try {
      setIsOnboardingOpen(false)
      setHasCompletedOnboarding(true)

      // Save to localStorage immediately
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')

      // Save to database
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true }),
      })

      if (response.ok) {
        toast.success('Welcome to SocialCal! 🎉', {
          description: 'You\'re all set to start creating amazing content.',
        })
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
      // Still mark as completed locally even if API fails
      toast.success('Welcome to SocialCal! 🎉')
    }
  }

  const skipOnboarding = async () => {
    try {
      setIsOnboardingOpen(false)
      setHasCompletedOnboarding(true)

      // Save to localStorage immediately
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
      localStorage.setItem(ONBOARDING_SKIP_KEY, 'true')

      // Save to database
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skipped: true }),
      })

      toast.info('Tour skipped', {
        description: 'You can restart the tour anytime from the dashboard.',
      })
    } catch (error) {
      console.error('Error skipping onboarding:', error)
      // Still mark as skipped locally even if API fails
    }
  }

  const closeOnboarding = () => {
    setIsOnboardingOpen(false)
  }

  const value = {
    isOnboardingOpen,
    hasCompletedOnboarding,
    isLoading,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    closeOnboarding,
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

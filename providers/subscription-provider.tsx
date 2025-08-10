'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getClientSubscription, ClientSubscription } from '@/lib/subscription/client'

interface SubscriptionContextType {
  subscription: ClientSubscription | null
  loading: boolean
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

// Cache subscription in sessionStorage to prevent flash on navigation
const CACHE_KEY = 'subscription_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CachedSubscription {
  data: ClientSubscription
  timestamp: number
}

function getCachedSubscription(): ClientSubscription | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const parsed: CachedSubscription = JSON.parse(cached)
    const now = Date.now()
    
    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed.data
    }
    
    // Cache expired
    sessionStorage.removeItem(CACHE_KEY)
    return null
  } catch {
    return null
  }
}

function setCachedSubscription(subscription: ClientSubscription) {
  if (typeof window === 'undefined') return
  
  try {
    const cached: CachedSubscription = {
      data: subscription,
      timestamp: Date.now()
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached))
  } catch {
    // Ignore storage errors
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  // Initialize with cached value to prevent flash
  const [subscription, setSubscription] = useState<ClientSubscription | null>(getCachedSubscription())
  const [loading, setLoading] = useState(() => !getCachedSubscription())

  const fetchSubscription = async () => {
    try {
      const sub = await getClientSubscription()
      
      if (!sub) {
        const defaultSub = { 
          hasSubscription: false, 
          planId: 'free' as const, 
          status: 'active',
          isTrialing: false 
        }
        setSubscription(defaultSub)
        setCachedSubscription(defaultSub)
      } else {
        setSubscription(sub)
        setCachedSubscription(sub)
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
      const defaultSub = { 
        hasSubscription: false, 
        planId: 'free' as const, 
        status: 'active',
        isTrialing: false 
      }
      setSubscription(defaultSub)
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    // Clear cache on manual refresh
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CACHE_KEY)
    }
    setLoading(true)
    await fetchSubscription()
  }

  useEffect(() => {
    fetchSubscription()
    
    // Refresh subscription on focus to catch updates
    const handleFocus = () => {
      fetchSubscription()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscriptionContext must be used within SubscriptionProvider')
  }
  return context
}
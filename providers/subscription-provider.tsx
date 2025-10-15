'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getClientSubscription, ClientSubscription } from '@/lib/subscription/client'

interface SubscriptionContextType {
  subscription: ClientSubscription | null
  loading: boolean
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<ClientSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSubscription = async () => {
    try {
      const sub = await getClientSubscription()

      if (!sub) {
        setSubscription({
          hasSubscription: false,
          planId: 'free' as const,
          status: 'active',
          isTrialing: false
        })
      } else {
        setSubscription(sub)
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
      setSubscription({
        hasSubscription: false,
        planId: 'free' as const,
        status: 'active',
        isTrialing: false
      })
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
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
'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function ThreadsTokenRefresher() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<Date | null>(null)

  useEffect(() => {
    const checkAndRefreshTokens = async () => {
      try {
        // Don't check more than once per hour
        const now = new Date()
        if (lastCheckRef.current) {
          const hoursSinceLastCheck = (now.getTime() - lastCheckRef.current.getTime()) / (1000 * 60 * 60)
          if (hoursSinceLastCheck < 1) {
            console.log('Skipping token check, last check was less than 1 hour ago')
            return
          }
        }
        
        lastCheckRef.current = now
        
        // Check token status
        const statusResponse = await fetch('/api/threads/refresh-token', {
          method: 'GET',
          credentials: 'include'
        })
        if (!statusResponse.ok) {
          return
        }
        
        const statusData = await statusResponse.json()
        console.log('Threads token status:', statusData)
        
        // If any tokens need refresh and can be refreshed, do it
        if (statusData.summary?.needingRefresh > 0 && statusData.summary?.canRefresh > 0) {
          console.log('Attempting to refresh Threads tokens...')
          
          const refreshResponse = await fetch('/api/threads/refresh-token', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            console.log('Token refresh result:', refreshData)
            
            if (refreshData.summary?.refreshed > 0) {
              console.log(`Successfully refreshed ${refreshData.summary.refreshed} token(s)`)
            }
            
            if (refreshData.needsReconnect) {
              toast.error('Your Threads account needs to be reconnected. Please go to Settings.')
            }
          }
        }
      } catch (error) {
        console.error('Error in token refresh check:', error)
      }
    }

    // Check immediately on mount
    checkAndRefreshTokens()

    // Then check every hour
    intervalRef.current = setInterval(checkAndRefreshTokens, 60 * 60 * 1000) // 1 hour

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OAuthRedirectHandler() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkOAuthRedirect = async () => {
      if (isProcessing) return

      const hash = window.location.hash
      const oauthAttemptTime = localStorage.getItem('oauth_attempt_time')

      // Check for recent OAuth attempt (within 30 seconds)
      if (oauthAttemptTime) {
        const timeSinceAttempt = Date.now() - parseInt(oauthAttemptTime)
        if (timeSinceAttempt < 30000) {
          setIsProcessing(true)

          await new Promise(resolve => setTimeout(resolve, 100))

          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            localStorage.removeItem('oauth_attempt_time')
            window.location.replace('/dashboard')
            return
          }
          setIsProcessing(false)
        } else {
          localStorage.removeItem('oauth_attempt_time')
        }
      }

      // Check for OAuth tokens in URL hash
      if (hash && (hash.includes('access_token') || hash.includes('error'))) {
        setIsProcessing(true)

        if (hash.includes('error')) {
          window.history.replaceState(null, '', window.location.pathname)
          setIsProcessing(false)
          return
        }

        // Wait for session to be established
        await new Promise(resolve => setTimeout(resolve, 500))

        let attempts = 0
        let session = null

        while (attempts < 5 && !session) {
          const { data: { session: currentSession } } = await supabase.auth.getSession()

          if (currentSession) {
            session = currentSession
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          attempts++
        }

        if (session) {
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
          // Force redirect to dashboard
          window.location.replace('/dashboard')
        } else {
          window.history.replaceState(null, '', window.location.pathname)
        }

        setIsProcessing(false)
      }
    }

    checkOAuthRedirect()
  }, [router, isProcessing, supabase])

  return null // This component is invisible
}
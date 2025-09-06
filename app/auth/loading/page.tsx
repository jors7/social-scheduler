'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthLoadingPage() {
  const supabase = createClient()

  useEffect(() => {
    console.log('Auth loading page mounted')
    console.log('Current URL hash:', window.location.hash)
    
    // Check if we have an authenticated session
    const checkAndRedirect = async () => {
      console.log('Checking session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      console.log('Session check result:', { 
        hasSession: !!session, 
        userEmail: session?.user?.email,
        error 
      })
      
      if (session) {
        console.log('Session found, redirecting to dashboard...')
        // User is authenticated, redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        console.log('No session found, redirecting to homepage...')
        // No session, something went wrong - redirect to homepage
        window.location.href = '/'
      }
    }

    // Handle auth state changes (for OAuth callbacks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change in loading page:', event, 'Session:', !!session)
      
      if (event === 'SIGNED_IN' && session) {
        console.log('SIGNED_IN event, redirecting to dashboard...')
        window.location.href = '/dashboard'
      }
    })

    // Give Supabase a moment to process the hash if it exists
    if (window.location.hash && window.location.hash.includes('access_token')) {
      console.log('Hash with access_token detected, waiting for Supabase to process...')
      setTimeout(() => {
        checkAndRedirect()
      }, 500)
    } else {
      checkAndRedirect()
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing you in...</h2>
        <p className="text-gray-600">Please wait while we redirect you</p>
      </div>
    </div>
  )
}
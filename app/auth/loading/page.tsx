'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthLoadingPage() {
  const supabase = createClient()

  useEffect(() => {
    // Check if we have an authenticated session
    const checkAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // User is authenticated, redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        // No session, something went wrong - redirect to homepage
        window.location.href = '/'
      }
    }

    // Handle auth state changes (for OAuth callbacks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        window.location.href = '/dashboard'
      }
    })

    checkAndRedirect()

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
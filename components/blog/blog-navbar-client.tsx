'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { AuthModals } from '@/components/auth/auth-modals'
import { createClient } from '@/lib/supabase/client'
import { getClientSubscription } from '@/lib/subscription/client'

export function NavbarClient() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [hasSubscription, setHasSubscription] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      setUserEmail(user?.email || null)

      // If user is authenticated, also check subscription status
      if (user) {
        const subscription = await getClientSubscription()
        setHasSubscription(subscription?.hasSubscription ?? false)
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      setIsAuthenticated(false)
      setUserEmail(null)
      setHasSubscription(false)
    }
  }

  return (
    <>
      {/* Shared Navbar Component */}
      <Navbar
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        hasSubscription={hasSubscription}
        onSignInClick={() => setSignInOpen(true)}
        onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        hasSubscription={hasSubscription}
        onSignInClick={() => setSignInOpen(true)}
      />

      {/* Auth Modals */}
      <AuthModals
        signInOpen={signInOpen}
        onSignInOpenChange={setSignInOpen}
      />
    </>
  )
}

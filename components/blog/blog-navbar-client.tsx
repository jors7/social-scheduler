'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { AuthModals } from '@/components/auth/auth-modals'
import { createClient } from '@/lib/supabase/client'

export function NavbarClient() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
    setUserEmail(user?.email || null)
  }

  return (
    <>
      {/* Shared Navbar Component */}
      <Navbar
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
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

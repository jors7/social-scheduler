'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Sparkles, Clock, BarChart, UserIcon, CreditCard, LogOut, Zap, Layers, LifeBuoy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  isAuthenticated: boolean | null
  userEmail: string | null
  onSignInClick?: () => void
  onSignUpClick?: () => void
}

export function MobileMenu({ 
  isOpen, 
  onClose, 
  isAuthenticated, 
  userEmail,
  onSignInClick,
  onSignUpClick
}: MobileMenuProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      if (response.ok) {
        toast.success('Logged out successfully')
        onClose()
        router.push('/')
        window.location.reload()
      } else {
        toast.error('Failed to logout')
      }
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('An error occurred while logging out')
    }
  }

  const handleNavigation = (href: string) => {
    onClose()
    if (href.startsWith('#')) {
      const currentPath = window.location.pathname
      const targetId = href.substring(1)
      
      // Special handling for FAQ which is on the pricing page
      if (targetId === 'faq-pricing') {
        if (currentPath === '/pricing') {
          // We're already on pricing page, just scroll to FAQ
          const element = document.getElementById('faq')
          if (element) {
            const headerOffset = 80
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
            const offsetPosition = elementPosition - headerOffset
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            })
          }
        } else {
          // Navigate to pricing page with scroll parameter
          router.push('/pricing?scroll=faq')
        }
      } else {
        // For other anchor links (features, platforms)
        if (currentPath === '/') {
          // We're on homepage, just scroll
          const element = document.getElementById(targetId)
          if (element) {
            const headerOffset = 80
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
            const offsetPosition = elementPosition - headerOffset
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            })
          }
        } else {
          // We're on another page, navigate to homepage with scroll parameter
          router.push(`/?scroll=${targetId}`)
        }
      }
    } else {
      router.push(href)
    }
  }

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  return (
    <>
      {/* Full-screen Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 transition-opacity duration-300 md:hidden opacity-100"
          onClick={onClose}
        />
      )}

      {/* Full-width Menu Panel - positioned below the header */}
      {isOpen && (
        <div 
          className="fixed top-16 left-0 right-0 max-h-[calc(100vh-4rem)] bg-white z-30 transform translate-y-0 transition-transform duration-300 ease-out md:hidden shadow-2xl overflow-y-auto"
        >
        {/* Menu Content */}
        <div className="flex flex-col">
          {/* User Info Section */}
          {isAuthenticated && userEmail && (
            <div className="px-4 pt-6 pb-4">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs">Signed in as</p>
                  <p className="text-gray-900 font-medium text-sm truncate">{userEmail}</p>
                </div>
              </div>
            </div>
          )}
          
          <nav className="px-4 pb-6">
            {isAuthenticated ? (
              // Authenticated Menu
              <>
                <div className="space-y-1 mb-6">
                  <Link
                    href="/dashboard"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 rounded-xl flex items-center justify-center transition-colors">
                      <Home className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-base">Dashboard</span>
                      <p className="text-xs text-gray-500">View your overview</p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard/create/new"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-purple-100 group-hover:from-purple-100 group-hover:to-purple-200 rounded-xl flex items-center justify-center transition-colors">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-base">Create Post</span>
                      <p className="text-xs text-gray-500">Schedule new content</p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard/posts"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-green-50 to-green-100 group-hover:from-green-100 group-hover:to-green-200 rounded-xl flex items-center justify-center transition-colors">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-base">My Posts</span>
                      <p className="text-xs text-gray-500">Manage your content</p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard/analytics"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-orange-100 group-hover:from-orange-100 group-hover:to-orange-200 rounded-xl flex items-center justify-center transition-colors">
                      <BarChart className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-base">Analytics</span>
                      <p className="text-xs text-gray-500">Track performance</p>
                    </div>
                  </Link>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-1">
                  <Link
                    href="/dashboard/profile"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <UserIcon className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">Profile</span>
                  </Link>

                  <Link
                    href="/dashboard/billing"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <CreditCard className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">Billing & Plans</span>
                  </Link>
                </div>

                <div className="border-t border-gray-200 mt-6 pt-6">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-red-50 group-hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors">
                      <LogOut className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-base">Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              // Non-authenticated Menu
              <>
                <div className="space-y-1 mb-6">
                  <button
                    onClick={() => {
                      onClose()
                      if (pathname === '/') {
                        // On homepage, just scroll
                        setTimeout(() => {
                          const element = document.getElementById('features')
                          if (element) {
                            const headerOffset = 80
                            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
                            const offsetPosition = elementPosition - headerOffset
                            window.scrollTo({
                              top: offsetPosition,
                              behavior: 'smooth'
                            })
                          }
                        }, 100)
                      } else {
                        // On other pages, navigate to homepage with scroll parameter
                        router.push('/?scroll=features')
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all duration-200 group text-left"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 rounded-xl flex items-center justify-center transition-colors">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-base">Features</span>
                      <p className="text-xs text-gray-500">Explore capabilities</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onClose()
                      if (pathname === '/') {
                        // On homepage, just scroll
                        setTimeout(() => {
                          const element = document.getElementById('platforms')
                          if (element) {
                            const headerOffset = 80
                            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
                            const offsetPosition = elementPosition - headerOffset
                            window.scrollTo({
                              top: offsetPosition,
                              behavior: 'smooth'
                            })
                          }
                        }, 100)
                      } else {
                        // On other pages, navigate to homepage with scroll parameter
                        router.push('/?scroll=platforms')
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-all duration-200 group text-left"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-purple-100 group-hover:from-purple-100 group-hover:to-purple-200 rounded-xl flex items-center justify-center transition-colors">
                      <Layers className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-base">Platforms</span>
                      <p className="text-xs text-gray-500">Supported networks</p>
                    </div>
                  </button>

                  <Link
                    href="/pricing"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-green-50 to-green-100 group-hover:from-green-100 group-hover:to-green-200 rounded-xl flex items-center justify-center transition-colors">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-base">Pricing</span>
                      <p className="text-xs text-gray-500">View our plans</p>
                    </div>
                  </Link>

                  <Link
                    href="/pricing?scroll=faq"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-orange-100 group-hover:from-orange-100 group-hover:to-orange-200 rounded-xl flex items-center justify-center transition-colors">
                      <LifeBuoy className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-base">FAQ</span>
                      <p className="text-xs text-gray-500">Get answers</p>
                    </div>
                  </Link>
                </div>

                <div className="border-t border-gray-200 pt-6 space-y-3 px-2">
                  <button
                    className="w-full py-3.5 px-4 text-base font-semibold border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                    onClick={() => {
                      onClose()
                      onSignInClick?.()
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    className="w-full py-3.5 px-4 text-base font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
                    onClick={() => {
                      onClose()
                      router.push('/pricing')
                    }}
                  >
                    ✨ Start Free Trial
                  </button>
                </div>
              </>
            )}
          </nav>
        </div>
      </div>
      )}
    </>
  )
}
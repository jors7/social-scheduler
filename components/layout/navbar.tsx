'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BarChart } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

interface NavbarProps {
  isAuthenticated: boolean | null
  userEmail: string | null
  onSignInClick?: () => void
  onMobileMenuClick?: () => void
  isMobileMenuOpen?: boolean
}

export function Navbar({ 
  isAuthenticated, 
  userEmail,
  onSignInClick,
  onMobileMenuClick,
  isMobileMenuOpen = false
}: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isHomepage = pathname === '/'

  const handleNavClick = (sectionId: string) => {
    if (isHomepage) {
      // If on homepage, just scroll to the section
      const element = document.getElementById(sectionId)
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
      // If on another page, navigate to homepage with the section
      router.push(`/#${sectionId}`)
    }
  }

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-white backdrop-blur-lg border-b border-gray-200 shadow-lg">
      <div className="container mx-auto px-6">
        <nav className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp" 
              alt="SocialCal Logo" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <span 
              className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent"
              style={{ 
                fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                fontWeight: 800 
              }}
            >
              SocialCal
            </span>
          </Link>
          <div className="flex items-center space-x-8">
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => handleNavClick('features')}
                className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                style={{ 
                  fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                }}
              >
                Features
              </button>
              <button 
                onClick={() => handleNavClick('platforms')}
                className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                style={{ 
                  fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                }}
              >
                Platforms
              </button>
              <Link 
                href="/pricing" 
                className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                style={{ 
                  fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                }}
              >
                Pricing
              </Link>
              <Link 
                href="/pricing?scroll=faq"
                className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                style={{ 
                  fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                }}
              >
                FAQ
              </Link>
            </div>
            {/* Desktop buttons - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated === null ? (
                <div className="w-48 h-10" />
              ) : isAuthenticated ? (
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="border border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    onClick={onSignInClick}
                    className="text-base font-medium border border-blue-500 text-blue-500 hover:bg-blue-50 transition-all duration-200 px-6 py-2"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => router.push('/pricing')}
                    className="text-base font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 px-6 py-2"
                  >
                    Start Free Trial
                  </Button>
                </>
              )}
            </div>
            <button 
              className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors mobile-menu-button"
              onClick={onMobileMenuClick}
            >
              <div className="flex flex-col gap-1.5">
                <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
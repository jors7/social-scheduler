'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function BlogLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
  }

  const scrollToSection = (sectionId: string) => {
    // Navigate to homepage and scroll to section
    router.push(`/#${sectionId}`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Blog Header */}
      <header className="border-b bg-white sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <nav className="flex items-center space-x-2 text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Link href="/blog" className="text-gray-900 font-medium">
                Blog
              </Link>
            </nav>
            
            {/* Right side navigation */}
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-6">
                <button 
                  onClick={() => scrollToSection('features')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  Features
                </button>
                <button 
                  onClick={() => scrollToSection('platforms')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  Platforms
                </button>
                <Link 
                  href="/pricing" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  Pricing
                </Link>
                <Link 
                  href="/pricing#faq" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  FAQ
                </Link>
              </div>
              
              {/* Show nothing while loading auth state */}
              {isAuthenticated === null ? (
                <div className="w-32 h-8" />
              ) : isAuthenticated ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <button 
                    onClick={() => router.push('/?signin=true')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-all duration-200"
                  >
                    Sign In
                  </button>
                  <Button 
                    size="sm"
                    onClick={() => router.push('/pricing')}
                    className="text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-200 px-4 py-1.5"
                  >
                    Start Free Trial
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer - Same as homepage */}
      <footer className="bg-gray-900 text-white py-12 px-4 mt-20">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-white">SocialCal</h3>
              <p className="text-gray-400">
                The all-in-one social media management platform for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/support" className="hover:text-white">Support</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 SocialCal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BarChart, Menu, ChevronRight, Clock, TrendingUp, Users, Layers, Zap, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AuthModals } from '@/components/auth/auth-modals'

import { MobileMenu } from '@/components/layout/mobile-menu'
export default function TermsOfServiceClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  // Handle mobile menu close on outside click and escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isMobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'auto'
    }
  }, [isMobileMenuOpen])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
    setUserEmail(user?.email || null)
  }

  

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header - Same as homepage */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-lg">
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
                <Link 
                  href="/?scroll=features"
                  className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  Features
                </Link>
                <Link 
                  href="/?scroll=platforms"
                  className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  Platforms
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  Pricing
                </Link>
                <Link 
                  href="/pricing?scroll=faq" 
                  className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  FAQ
                </Link>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                {isAuthenticated ? (
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/dashboard')}
                    className="border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  >
                    <BarChart className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <button 
                      onClick={() => setSignInOpen(true)}
                      className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                    >
                      Sign In
                    </button>
                    <Button 
                      onClick={() => router.push('/pricing')}
                      className="text-base font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 px-6 py-2"
                    >
                      Start Free Trial
                    </Button>
                  </>
                )}
              </div>
              <button 
                className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors mobile-menu-button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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

      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignInClick={() => setSignInOpen(true)}
        onSignUpClick={() => setSignUpOpen(true)}
      />

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl py-16 px-6">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            Terms of Service
          </h1>
          <p className="text-lg text-gray-600">
            Last updated: January 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-12">
          <div className="prose prose-lg max-w-none">
            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                By accessing and using <strong>SocialCal</strong> (&quot;the Service&quot;), you agree to be bound by these Terms. If you do not agree, please discontinue use.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Service Description</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                SocialCal is a web application that allows users to connect their social media accounts, schedule and publish posts, manage content across multiple platforms, and view analytics.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                To access certain features, you must register an account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Provide accurate and complete registration information.</li>
                <li>Maintain the confidentiality of your login credentials.</li>
                <li>Accept responsibility for all activities under your account.</li>
                <li>Notify us of any unauthorized use immediately.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Social Media Integration</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                By connecting your accounts, you grant SocialCal permission to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Access your connected accounts for scheduling, publishing, and analytics.</li>
                <li>Act on your behalf only to the extent necessary to provide the Service.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                You remain fully responsible for the content you create and post. You must comply with the terms of each connected platform (e.g., Meta, X/Twitter, LinkedIn, YouTube, TikTok, Pinterest). You may revoke access at any time through your account settings or directly via the platform.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Content Guidelines</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree not to post content through the Service that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Violates any law or regulation.</li>
                <li>Infringes intellectual property rights.</li>
                <li>Contains hate speech, harassment, or discriminatory content.</li>
                <li>Includes spam or misleading information.</li>
                <li>Violates the policies of the connected platform.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">6. Subscriptions & Payments</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>SocialCal offers subscription plans with monthly or annual billing.</li>
                <li>Payments are securely processed by <strong>Stripe</strong>.</li>
                <li>Subscriptions renew automatically unless cancelled before the next billing date.</li>
                <li>You may cancel at any time in your dashboard; cancellation takes effect at the end of the billing cycle.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">7. Refund Policy</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>We provide a <strong>7-day free trial</strong> for new users.</li>
                <li>Paid subscriptions include a <strong>14-day money-back guarantee</strong>.</li>
                <li>Refund requests must be sent to <strong><a href="mailto:support@socialcal.app" className="text-blue-600 hover:text-blue-700">support@socialcal.app</a></strong>.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">8. Data Privacy</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We process personal and account data in accordance with our Privacy Policy. You retain ownership of your content and account data.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">9. Termination</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may suspend or terminate your account if you violate these Terms or misuse the Service.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">10. Intellectual Property</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                All app code, design, and branding belong to SocialCal. You retain ownership of any content you upload or schedule.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">11. Limitation of Liability</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                The Service is provided &quot;as is.&quot; To the fullest extent permitted by law, SocialCal is not liable for indirect or consequential damages, including lost profits or lost data.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                These Terms are governed by the laws of the <strong>Czech Republic</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer - Same as homepage */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-2xl font-bold mb-4 text-white">SocialCal</h3>
              <p className="text-gray-400">
                The all-in-one social media scheduler for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2025 SocialCal. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <AuthModals
        signInOpen={signInOpen}
        signUpOpen={signUpOpen}
        onSignInOpenChange={setSignInOpen}
        onSignUpOpenChange={setSignUpOpen}
      />
    </div>
  )
}
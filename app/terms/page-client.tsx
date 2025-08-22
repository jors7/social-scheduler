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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                By accessing and using SocialCal (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                SocialCal is a web application that allows users to schedule and manage posts across multiple social media platforms. Our service enables you to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Connect your social media accounts</li>
                <li>Schedule posts for future publication</li>
                <li>Manage content across multiple platforms</li>
                <li>View analytics and insights</li>
                <li>Use AI-powered content suggestions</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                To access certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Social Media Integration</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you connect your social media accounts to our Service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>You grant us permission to post content on your behalf</li>
                <li>You remain responsible for all content posted through our Service</li>
                <li>You must comply with each platform&apos;s terms of service</li>
                <li>You can revoke access at any time through your account settings</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Content Guidelines</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree not to post content that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Violates any laws or regulations</li>
                <li>Infringes on intellectual property rights</li>
                <li>Contains hate speech or discriminatory content</li>
                <li>Includes spam or misleading information</li>
                <li>Violates the terms of the connected social media platforms</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Subscription and Payments</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our Service offers various subscription plans:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Free trial period of 14 days</li>
                <li>Monthly or annual billing cycles</li>
                <li>Automatic renewal unless cancelled</li>
                <li>Refunds are provided according to our refund policy</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                You can cancel your subscription at any time through your account settings. Cancellation will take effect at the end of your current billing period.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Privacy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We take your privacy seriously. Please review our Privacy Policy for information about how we collect, use, and protect your data. Key points include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>We encrypt sensitive data</li>
                <li>We don&apos;t sell your personal information</li>
                <li>We comply with GDPR and CCPA regulations</li>
                <li>You can request data deletion at any time</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                To the maximum extent permitted by law, SocialCal shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Termination</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service. Your continued use of the Service after such modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="text-gray-700 font-semibold">SocialCal Support</p>
                <p className="text-gray-600">Email: support@socialcal.app</p>
                <p className="text-gray-600">Website: <Link href="/" className="text-blue-600 hover:text-blue-700">socialcal.app</Link></p>
              </div>
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
            <div className="col-span-2 md:col-span-1">
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
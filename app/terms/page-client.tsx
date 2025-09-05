'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BarChart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthModals } from '@/components/auth/auth-modals'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { Navbar } from '@/components/layout/navbar'

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

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
    setUserEmail(user?.email || null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar 
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignInClick={() => setSignInOpen(true)}
        onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <MobileMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignInClick={() => setSignInOpen(true)}
        onSignUpClick={() => setSignUpOpen(true)}
      />

      <div className="container mx-auto max-w-4xl py-16 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            Terms of Service
          </h1>
          <p className="text-lg text-gray-600">
            Last updated: January 2025
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-12">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h2>
            
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
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the confidentiality of your login credentials</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us of any unauthorized use immediately</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Social Media Integration</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                By connecting your accounts, you grant SocialCal permission to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Access your connected accounts for scheduling, publishing, and analytics</li>
                <li>Act on your behalf only to the extent necessary to provide the Service</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                You remain fully responsible for the content you create and post. You must comply with the terms of each connected platform (e.g., Meta, X/Twitter, LinkedIn, YouTube, TikTok, Pinterest). You may revoke access at any time through your account settings or directly via the platform.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>Meta Platforms Specific Requirements:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>You must comply with Meta&apos;s Platform Terms and Community Standards</li>
                <li>You understand Meta may revoke access permissions at any time</li>
                <li>You agree to Meta&apos;s data handling and privacy practices</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Content Guidelines</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree not to post content through the Service that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Violates any law or regulation</li>
                <li>Infringes intellectual property rights</li>
                <li>Contains hate speech, harassment, or discriminatory content</li>
                <li>Includes spam or misleading information</li>
                <li>Violates the policies of the connected platform</li>
                <li>Distributes malware or harmful content</li>
                <li>Impersonates any person or entity</li>
                <li>Circumvents platform rate limits or restrictions</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">6. Subscriptions & Payments</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>SocialCal offers subscription plans with monthly or annual billing</li>
                <li>Payments are securely processed by <strong>Stripe</strong></li>
                <li>Subscriptions renew automatically unless cancelled before the next billing date</li>
                <li>You may cancel at any time in your dashboard; cancellation takes effect at the end of the billing cycle</li>
                <li>Price changes will be notified with 30 days notice</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">7. Refund Policy</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>We provide a <strong>7-day free trial</strong> for new users</li>
                <li>Paid subscriptions include a <strong>14-day money-back guarantee</strong></li>
                <li>Refund requests must be sent to <strong>support@socialcal.app</strong></li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">8. Data Privacy</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We process personal and account data in accordance with our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>. You retain ownership of your content and account data.
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
              <h3 className="text-2xl font-bold text-gray-900 mb-4">12. Disclaimer</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>No Guarantee of Results</strong>: SocialCal helps schedule posts but does not guarantee engagement, growth, or revenue</li>
                <li><strong>Third-Party Responsibility</strong>: SocialCal is not responsible for outages or changes in third-party platforms (e.g., Meta, TikTok)</li>
                <li><strong>No Professional Advice</strong>: Nothing in the Service constitutes legal, financial, or business advice</li>
                <li>We are not liable for third-party platform outages</li>
                <li>We don&apos;t guarantee specific results or outcomes</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                These Terms are governed by the laws of the <strong>Czech Republic</strong>.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">14. Service Availability</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>We strive for 99.9% uptime but don&apos;t guarantee uninterrupted service</li>
                <li>We may modify or discontinue features with notice</li>
                <li>Scheduled maintenance will be communicated in advance when possible</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">15. Indemnification</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree to indemnify and hold us harmless from any claims arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Your content posted through the Service</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">16. Changes to Terms</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may update these Terms at any time. Continued use after changes constitutes acceptance. Material changes will be notified via email or in-app notification.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">17. Company Information</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>SocialCal</strong> – operated by <strong>Jan Oršula</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>IČO: 75463822</li>
                <li>Not a VAT payer</li>
                <li>Business Address: Marie Majerove 1633, Sokolov, 35601, Czech Republic</li>
                <li>Email: support@socialcal.app</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">18. Contact Information</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                For questions about these Terms:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Email: support@socialcal.app</li>
                <li>Support: <Link href="/contact" className="text-blue-600 hover:underline">Contact Form</Link></li>
                <li>Privacy: <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link></li>
              </ul>
            </section>
          </div>
        </div>
      </div>

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

      <AuthModals
        signInOpen={signInOpen}
        signUpOpen={signUpOpen}
        onSignInOpenChange={setSignInOpen}
        onSignUpOpenChange={setSignUpOpen}
      />
    </div>
  )
}
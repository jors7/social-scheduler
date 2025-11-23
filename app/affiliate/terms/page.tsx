'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { AuthModals } from '@/components/auth/auth-modals'
import { createClient } from '@/lib/supabase/client'

export default function AffiliateTermsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
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
    <div className="min-h-screen bg-white">
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

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            Affiliate Program Terms & Conditions
          </h1>
          <p className="text-lg text-gray-600">
            Last Updated: January 2025
          </p>
        </div>

        <div className="prose prose-lg max-w-none space-y-12">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">1. Agreement Overview</h2>
            <p className="text-gray-700 mb-4">
              Welcome to the SocialCal Affiliate Program. By participating in the Program, you (Affiliate) agree to be bound by these Terms and Conditions (Agreement). This Agreement is between you and SocialCal (Company, we, us, or our).
            </p>
            <p className="text-gray-700">
              We reserve the right to modify these terms at any time with reasonable notice. Continued participation in the Program after modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          {/* Commission Structure */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">2. Commission Structure</h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">2.1 Commission Rate</h3>
            <p className="text-gray-700 mb-4">
              Affiliates earn a 30% recurring commission on all paid subscriptions referred for a period of 12 consecutive months from the date of the customer&apos;s first payment.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">2.2 Attribution Window</h3>
            <p className="text-gray-700">
              We use a 90-day cookie window. If a user clicks your affiliate link and subscribes within 90 days, you will receive credit for that referral.
            </p>
          </section>

          {/* Payment Terms */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">3. Payment Terms</h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">3.1 Payment Schedule</h3>
            <p className="text-gray-700 mb-4">
              Commissions are paid monthly, approximately 30 days after the end of the calendar month in which they were earned. This delay allows for processing refunds and chargebacks.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">3.2 Minimum Payout</h3>
            <p className="text-gray-700">
              The minimum payout amount is $50 USD. If your commission balance is below this threshold, it will roll over to the following month until the minimum is reached.
            </p>
          </section>

          {/* Prohibited Activities */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">4. Prohibited Marketing Activities</h2>
            <p className="text-gray-700 mb-4">
              The following marketing practices are strictly prohibited:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Bidding on SocialCal or brand terms in paid search advertising</li>
              <li>Self-referrals or signing up through your own affiliate link</li>
              <li>Cookie stuffing or forcing affiliate cookies without genuine user interaction</li>
              <li>Using bots, automated systems, or incentivized clicks</li>
              <li>Spam email campaigns or purchased email lists</li>
              <li>False or misleading claims about product features</li>
              <li>Promoting on websites with adult content, hate speech, or illegal activities</li>
            </ul>
          </section>

          {/* FTC Compliance */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">5. FTC Disclosure Requirements</h2>
            <p className="text-gray-700 mb-4">
              You must clearly and conspicuously disclose your affiliate relationship with SocialCal whenever promoting our product. Disclosures must appear before the affiliate link or call-to-action.
            </p>
            <p className="text-gray-700 italic">
              Example: This post contains affiliate links. I may earn a commission if you purchase through my link.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">6. Termination</h2>
            <p className="text-gray-700 mb-4">
              Either party may terminate participation with 30 days&apos; written notice. We reserve the right to terminate immediately for violations of these terms or fraudulent activity.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Contact Information</h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> support@socialcal.app</p>
              <p><strong>Affiliate Portal:</strong> <a href="https://socialcalapp-49d0.endorsely.com" className="text-purple-600 hover:text-purple-700 underline" target="_blank" rel="noopener noreferrer">https://socialcalapp-49d0.endorsely.com</a></p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded">
            <h3 className="text-xl font-bold mb-3 text-gray-900">Acknowledgment</h3>
            <p className="text-gray-700">
              By applying to and participating in the SocialCal Affiliate Program, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
            </p>
          </section>
        </div>

        {/* CTA to Apply */}
        <div className="mt-12 text-center">
          <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Link href="/affiliate">
              Apply to Join Program
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 mt-20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-2xl font-bold mb-4">SocialCal</h3>
              <p className="text-gray-400">
                The all-in-one social media scheduler
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-white">Home</Link></li>
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
            <div>
              <h4 className="font-semibold mb-4">Partners</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/affiliate" className="hover:text-white">Affiliate Program</Link></li>
                <li><Link href="/affiliate/terms" className="hover:text-white">Affiliate Terms</Link></li>
              </ul>
            </div>
            <div className="md:col-span-1">
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
        onSignInOpenChange={setSignInOpen}
      />
    </div>
  )
}

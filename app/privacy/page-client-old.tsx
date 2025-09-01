'use client'
// Privacy Policy page

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
import { Navbar } from '@/components/layout/navbar'

export default function PrivacyPolicyClient() {
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
      {/* Shared Navbar Component */
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
        onSignUpClick={() => setSignUpOpen(true)}
      />

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl py-16 px-6">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600">
            Last updated: January 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-12">
          <div className="prose prose-lg max-w-none">
            {/* Privacy Policy Section */}
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h2>
            
            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Account Data</strong>: Name, email, password.</li>
                <li><strong>Third-Party Login Data</strong>: If you sign in with Google, we collect your Google account email and profile information for authentication purposes only.</li>
                <li><strong>Social Media Data</strong>: Authentication tokens, scheduled content, analytics (collected only with your consent).</li>
                <li><strong>Payment Data</strong>: Processed securely via Stripe (we never store full card details).</li>
                <li><strong>Usage Data</strong>: Browser, IP address, time zone, app interactions.</li>
                <li><strong>AI Features</strong>: Optional AI content suggestions (processed by OpenAI).</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Data</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>To provide and improve the Service.</li>
                <li>To publish scheduled posts on your behalf.</li>
                <li>To process payments and manage subscriptions.</li>
                <li>To send you updates and important account information.</li>
                <li>To comply with legal obligations.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Sharing Data</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We share limited data only with:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Stripe</strong> – payment processing.</li>
                <li><strong>Supabase</strong> – secure hosting and authentication.</li>
                <li><strong>OpenAI</strong> – content suggestions (if used).</li>
                <li><strong>Social Media APIs</strong> – to post and manage content on your behalf.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                We never sell personal or social media data.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">4. API & Platform Compliance</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>We use APIs of Meta (Facebook, Instagram, Threads), X/Twitter, LinkedIn, YouTube, TikTok, and Pinterest <strong>only as necessary</strong> to provide the Service.</li>
                <li>We do not use social media data for advertising or analytics outside the Service.</li>
                <li>Users may disconnect accounts at any time via SocialCal or directly at the platform.</li>
                <li>We comply with each platform&apos;s developer policies.</li>
              </ul>
              
              <h4 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Google API Services & YouTube Data</h4>
              <p className="text-gray-600 leading-relaxed mb-4">
                SocialCal&apos;s use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>YouTube Data Usage:</strong> We access YouTube APIs solely to enable you to upload videos, manage your YouTube channel content, and view your channel information through SocialCal.</li>
                <li><strong>Data We Access:</strong> Channel name, channel ID, video upload capabilities, and basic channel statistics (only what&apos;s necessary for the service).</li>
                <li><strong>Data Storage:</strong> We store only your YouTube access tokens (encrypted) and basic channel information. Video content remains on YouTube&apos;s servers.</li>
                <li><strong>Data Sharing:</strong> We never share your YouTube data with third parties except as required to provide the service (e.g., displaying your channel name in the app).</li>
                <li><strong>Data Deletion:</strong> When you disconnect your YouTube account, we immediately delete all stored YouTube data including access tokens and channel information.</li>
                <li><strong>Limited Use Compliance:</strong> We only use Google user data to provide and improve user-facing features visible to you. We do not use this data for advertising, market research, or any purpose other than providing SocialCal&apos;s core functionality.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                You can revoke SocialCal&apos;s access to your Google/YouTube data at any time by visiting <a href="https://myaccount.google.com/permissions" className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">Google Account Permissions</a>.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use encryption in transit and at rest, secure hosting, and access controls. Payment data is handled by Stripe (PCI-compliant).
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights & Data Deletion</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You may:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Access your personal data.</li>
                <li>Request correction or deletion.</li>
                <li>Export your data.</li>
                <li>Revoke platform integrations at any time.</li>
                <li>Request account deletion via <strong><a href="mailto:support@socialcal.app" className="text-blue-600 hover:text-blue-700">support@socialcal.app</a></strong>.</li>
              </ul>
              
              <h4 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Data Deletion Instructions</h4>
              <p className="text-gray-600 leading-relaxed mb-4">
                To delete your data from SocialCal:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Immediate Self-Service:</strong> Go to Dashboard → Settings → Account and click &quot;Delete Account&quot;. This will immediately delete your account and all associated data.</li>
                <li><strong>Email Request:</strong> Send a deletion request to <a href="mailto:support@socialcal.app" className="text-blue-600 hover:text-blue-700">support@socialcal.app</a> from your registered email. We will process your request within 48 hours.</li>
                <li><strong>Platform-Specific Data:</strong> To revoke access to social media accounts:
                  <ul className="list-disc pl-6 mt-2">
                    <li>Google/YouTube: Visit <a href="https://myaccount.google.com/permissions" className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">Google Account Permissions</a></li>
                    <li>Facebook/Instagram: Visit <a href="https://www.facebook.com/settings?tab=business_tools" className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">Facebook Business Integrations</a></li>
                    <li>Other platforms: Check the respective platform&apos;s app permissions settings</li>
                  </ul>
                </li>
              </ol>
              <p className="text-gray-600 leading-relaxed mb-4">
                Upon deletion, we remove all your personal data, posts, media files, and social media connections. Some anonymized usage statistics may be retained for service improvement. Payment records are kept as legally required.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use cookies for login, authentication, analytics, and user preferences. Essential cookies cannot be disabled.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfers</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your data may be processed outside your country. We apply GDPR-compliant safeguards where applicable.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">9. Retention</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Account data: until you delete your account.</li>
                <li>Posted content: removed after 90 days.</li>
                <li>Payment data: retained as required by law (typically 7 years).</li>
                <li>Support records: 2 years.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">10. Children&apos;s Privacy</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                SocialCal is not intended for children under 13.
              </p>
            </section>

            <hr className="my-12 border-gray-300" />

            {/* Disclaimer Section */}
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Disclaimer</h2>
            
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-8">
              <li><strong>No Guarantee of Results</strong>: SocialCal helps schedule posts but does not guarantee engagement, growth, or revenue.</li>
              <li><strong>Third-Party Responsibility</strong>: SocialCal is not responsible for outages or changes in third-party platforms (e.g., Meta, TikTok).</li>
              <li><strong>No Professional Advice</strong>: Nothing in the Service constitutes legal, financial, or business advice.</li>
            </ul>

            <hr className="my-12 border-gray-300" />

            {/* Privacy Settings Section */}
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Privacy Settings</h2>
            
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-8">
              <li>Manage email preferences in your account dashboard.</li>
              <li>Disconnect integrated social media accounts anytime.</li>
              <li>Request account/data deletion at <strong><a href="mailto:support@socialcal.app" className="text-blue-600 hover:text-blue-700">support@socialcal.app</a></strong>.</li>
            </ul>

            <hr className="my-12 border-gray-300" />

            {/* Company Information Section */}
            <section className="mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Company Information</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 font-semibold mb-2">SocialOrbit – operated by <strong>Jan Oršula</strong></p>
                <p className="text-gray-600">IČO: 75463822</p>
                <p className="text-gray-600">Not a VAT payer</p>
                <p className="text-gray-600 mt-4"><strong>Business Address:</strong></p>
                <p className="text-gray-600">Marie Majerove 1633<br />Sokolov<br />35601<br />Czech Republic</p>
                <p className="text-gray-600 mt-4">Email: <a href="mailto:support@socialorbit.app" className="text-blue-600 hover:text-blue-700">support@socialorbit.app</a></p>
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


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
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600">
            Last updated: January 2025
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-12">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h2>
            
            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Account Data</strong>: Name, email, password.</li>
                <li><strong>Third-Party Login Data</strong>: If you sign in with Google, we collect your Google account email and profile information for authentication purposes only.</li>
                <li><strong>Social Media Platform Data</strong>: 
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><strong>Meta Platforms (Facebook, Instagram, Threads)</strong>: User ID, page/account names, page access tokens, content permissions</li>
                    <li><strong>Pinterest</strong>: User ID, board information, authentication tokens for pin creation</li>
                    <li><strong>Other Platforms (X/Twitter, LinkedIn, YouTube, TikTok, Bluesky)</strong>: Authentication tokens, usernames, profile information necessary for posting</li>
                    <li><strong>Content Data</strong>: Posts, images, videos you create and schedule</li>
                    <li><strong>Analytics</strong>: Post performance metrics (with your consent)</li>
                  </ul>
                </li>
                <li><strong>Payment Data</strong>: Processed securely via Stripe (we never store full card details).</li>
                <li><strong>Usage Data</strong>: Browser, IP address, time zone, app interactions.</li>
                <li><strong>AI Features</strong>: Optional AI content suggestions (processed by OpenAI).</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Data</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>To provide and improve the Service.</li>
                <li>To authenticate and connect your social media accounts.</li>
                <li>To publish scheduled posts on your behalf to connected platforms.</li>
                <li>To display analytics and performance metrics for your content.</li>
                <li>To process payments and manage subscriptions.</li>
                <li>To send you updates and important account information.</li>
                <li>To comply with legal obligations.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Meta Platform Data Handling</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you connect your Facebook, Instagram, or Threads accounts:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Data We Access</strong>: Only the minimum data required to post content and read basic analytics.</li>
                <li><strong>Data Storage</strong>: Access tokens are encrypted and stored securely in our database.</li>
                <li><strong>Data Usage</strong>: Used solely to perform actions you explicitly request (posting, scheduling, analytics).</li>
                <li><strong>Data Deletion</strong>: You can disconnect accounts anytime. We support Meta&apos;s data deletion callbacks.</li>
                <li><strong>No Third-Party Sharing</strong>: We never sell or share your Meta platform data with advertisers or other third parties.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Data Processors and Service Providers</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We work with trusted service providers to deliver our service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Supabase Inc.</strong>: Database hosting and authentication services</li>
                <li><strong>Cloudflare, Inc.</strong>: Media storage and content delivery</li>
                <li><strong>Vercel Inc.</strong>: Application hosting and deployment</li>
                <li><strong>OpenAI, L.L.C.</strong>: AI-powered content suggestions (optional feature)</li>
                <li><strong>Stripe, Inc.</strong>: Payment processing (no social media data shared)</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                These processors are contractually bound to protect your data and use it only as we direct.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Industry-standard encryption for data in transit and at rest</li>
                <li>Row-level security on database access</li>
                <li>Regular security audits and updates</li>
                <li>Secure OAuth 2.0 authentication for social platforms</li>
                <li>Automatic token refresh and validation</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights and Controls</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Access</strong>: View all data we have about you in your account settings</li>
                <li><strong>Correction</strong>: Update your profile and connected accounts anytime</li>
                <li><strong>Deletion</strong>: Request complete account and data deletion</li>
                <li><strong>Portability</strong>: Export your data in a machine-readable format</li>
                <li><strong>Disconnection</strong>: Remove social media connections instantly</li>
                <li><strong>Consent Withdrawal</strong>: Opt out of optional features like analytics</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Account Data</strong>: Until you delete your account</li>
                <li><strong>Posted Content</strong>: Removed after 90 days</li>
                <li><strong>Payment Data</strong>: Retained as required by law (typically 7 years)</li>
                <li><strong>Support Records</strong>: 2 years</li>
                <li><strong>Media Files</strong>: Automatically deleted after successful posting</li>
                <li><strong>Disconnected Social Accounts</strong>: Tokens deleted immediately upon disconnection</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">8. Sharing Data</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We share limited data only with:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Stripe</strong>: Payment processing</li>
                <li><strong>Supabase</strong>: Secure hosting and authentication</li>
                <li><strong>OpenAI</strong>: Content suggestions (if used)</li>
                <li><strong>Cloudflare</strong>: Media storage and CDN</li>
                <li><strong>Vercel</strong>: Application hosting</li>
                <li><strong>Social Media APIs</strong>: To post and manage content on your behalf</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                We never sell personal or social media data.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">9. API & Platform Compliance</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>We use APIs of Meta (Facebook, Instagram, Threads), Pinterest, X/Twitter, LinkedIn, YouTube, TikTok, and Bluesky only as necessary to provide the Service</li>
                <li>We do not use social media data for advertising or analytics outside the Service</li>
                <li>Users may disconnect accounts at any time via SocialCal or directly at the platform</li>
                <li>We comply with each platform&apos;s developer policies</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">10. Cookies</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use cookies for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Login and authentication</li>
                <li>Analytics and performance monitoring</li>
                <li>User preferences and settings</li>
                <li>Essential cookies cannot be disabled</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">11. International Data Transfers</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your data may be processed outside your country. We apply GDPR-compliant safeguards where applicable and ensure appropriate protection for international transfers.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">12. Legal Requests and Compliance</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may disclose your information if required by law or valid legal process. We will:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Review the legality of all requests</li>
                <li>Challenge unlawful requests when appropriate</li>
                <li>Minimize data disclosure to what&apos;s legally required</li>
                <li>Notify you of requests unless legally prohibited</li>
                <li>Document all requests and our responses</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">13. California Privacy Rights (CCPA)</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                California residents have additional rights including the right to know, delete, and opt-out of data sales (we don&apos;t sell data).
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">14. European Privacy Rights (GDPR)</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                EU residents have rights under GDPR including access, rectification, erasure, and data portability. Contact us to exercise these rights.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">15. Children&apos;s Privacy</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                SocialCal is not intended for children under 13. We do not knowingly collect data from children.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">16. Privacy Settings</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Manage email preferences in your account dashboard</li>
                <li>Disconnect integrated social media accounts anytime</li>
                <li>Request account/data deletion at support@socialcal.app</li>
              </ul>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">17. Changes to This Policy</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may update this policy and will notify you of material changes via email or in-app notification.
              </p>
            </section>

            <section className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">18. Company Information</h3>
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
              <h3 className="text-2xl font-bold text-gray-900 mb-4">19. Contact Us</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                For privacy concerns or to exercise your rights:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Email: support@socialcal.app</li>
                <li>Data Deletion Requests: Email support@socialcal.app with subject "Data Deletion Request"</li>
                <li>Support: <Link href="/contact" className="text-blue-600 hover:underline">Contact Form</Link></li>
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
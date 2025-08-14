'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BarChart, Menu, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PrivacyPolicy() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header - Same as homepage */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-lg">
        <div className="container mx-auto px-6">
          <nav className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/SocialCal.png" 
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
                  href="/#features" 
                  className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  Features
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  Pricing
                </Link>
              </div>
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
                  <Link 
                    href="/login"
                    className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                  <Button 
                    onClick={() => router.push('/pricing')}
                    className="text-base font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 px-6 py-2"
                  >
                    Start Free Trial
                  </Button>
                </>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden hover:bg-gray-100 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </nav>
        </div>
      </header>

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
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                SocialCal collects information you provide directly to us, such as when you:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Create an account</li>
                <li>Connect your social media accounts</li>
                <li>Create and schedule posts</li>
                <li>Contact us for support</li>
                <li>Subscribe to our service</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                This information may include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Name and email address</li>
                <li>Social media account credentials (encrypted)</li>
                <li>Content you create and post</li>
                <li>Payment information (processed securely via Stripe)</li>
                <li>Usage data and analytics</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Provide and maintain our services</li>
                <li>Post content to your connected social media accounts</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send you important service updates</li>
                <li>Improve and optimize our platform</li>
                <li>Provide customer support</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We do not sell, trade, or rent your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>With your consent:</strong> When you explicitly agree to share</li>
                <li><strong>Service providers:</strong> With trusted third-party services that help us operate (e.g., Stripe for payments, Supabase for hosting)</li>
                <li><strong>Legal requirements:</strong> When required by law or to protect rights and safety</li>
                <li><strong>Business transfers:</strong> In connection with a merger or acquisition</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Regular security audits and updates</li>
                <li>Secure authentication with Supabase Auth</li>
                <li>Limited access to personal information by employees</li>
                <li>PCI-compliant payment processing through Stripe</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights and Choices</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Revoke access:</strong> Disconnect social media accounts at any time</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies and Tracking</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Maintain your session and authentication</li>
                <li>Remember your preferences</li>
                <li>Analyze usage patterns to improve our service</li>
                <li>Provide personalized features</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                You can control cookies through your browser settings, but disabling them may limit functionality.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Third-Party Services</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We integrate with the following third-party services:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li><strong>Stripe:</strong> Payment processing (PCI-compliant)</li>
                <li><strong>Supabase:</strong> Database and authentication</li>
                <li><strong>OpenAI:</strong> AI-powered content suggestions</li>
                <li><strong>Social Media APIs:</strong> Facebook, Instagram, Twitter/X, etc.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                Each service has its own privacy policy. We encourage you to review them.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We retain your information for as long as necessary to provide our services and comply with legal obligations:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Account information: Until you delete your account</li>
                <li>Posted content: 90 days after posting</li>
                <li>Payment records: As required by tax laws (typically 7 years)</li>
                <li>Support communications: 2 years</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this privacy policy.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children&apos;s Privacy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our service is not intended for users under 13 years of age. We do not knowingly collect information from children under 13. If we discover we have collected information from a child under 13, we will delete it immediately.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. GDPR Compliance</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                For users in the European Economic Area (EEA), we comply with GDPR requirements:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Legal basis for processing (consent, contract, legitimate interest)</li>
                <li>Data protection rights as outlined above</li>
                <li>Data Protection Officer contact available upon request</li>
                <li>Right to lodge complaints with supervisory authorities</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. California Privacy Rights (CCPA)</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                California residents have additional rights under CCPA:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Right to know what personal information is collected</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of sale of personal information (we do not sell data)</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to This Policy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may update this privacy policy from time to time. We will notify you of material changes via email or through the service. Your continued use after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Us</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have questions about this privacy policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="text-gray-700 font-semibold">SocialCal Privacy Team</p>
                <p className="text-gray-600">Email: privacy@socialcal.app</p>
                <p className="text-gray-600">Support: support@socialcal.app</p>
                <p className="text-gray-600">Website: <Link href="/" className="text-blue-600 hover:text-blue-700">socialcal.app</Link></p>
              </div>
              <p className="text-gray-600 leading-relaxed mt-4">
                For GDPR inquiries, EU residents can contact our Data Protection Officer at dpo@socialcal.app
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer - Same as homepage */}
      <footer className="bg-gray-900 text-white py-12 px-4">
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
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
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
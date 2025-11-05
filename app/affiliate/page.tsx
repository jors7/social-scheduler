'use client'

import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, DollarSign, TrendingUp, Users, BarChart, Clock, Sparkles, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { AuthModals } from '@/components/auth/auth-modals'
import { createClient } from '@/lib/supabase/client'

const ENDORSELY_SIGNUP_URL = 'https://socialcalapp-49d0.endorsely.com'

export default function AffiliatePage() {
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
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Shared Navbar */}
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

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-50 via-blue-50 to-white">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
            <DollarSign className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Earn Passive Income</span>
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-gray-900">
            Earn 30% Recurring<br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Commissions for 12 Months
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Partner with SocialCal and earn passive income promoting the all-in-one social media scheduler trusted by thousands of creators and businesses.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <a href={ENDORSELY_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                Apply to Join Program
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-2 hover:border-purple-300 hover:bg-purple-50"
            >
              <Link href="/affiliate/terms">
                View Program Terms
              </Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>90-day cookie window</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Monthly payouts</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Real-time analytics</span>
            </div>
          </div>
        </div>
      </section>

      {/* Program Benefits */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              Why Join SocialCal&apos;s Affiliate Program?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to earn consistent passive income promoting a product your audience will love
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: DollarSign,
                title: '30% Recurring Commission',
                description: 'Earn 30% of all subscription revenue for 12 months on every referral',
                gradient: 'from-purple-500 to-purple-600'
              },
              {
                icon: Clock,
                title: '90-Day Cookie Window',
                description: 'Get credit for conversions up to 90 days after someone clicks your link',
                gradient: 'from-blue-500 to-blue-600'
              },
              {
                icon: TrendingUp,
                title: 'Monthly Payouts',
                description: 'Reliable monthly payments via PayPal or Stripe, $50 minimum payout',
                gradient: 'from-green-500 to-green-600'
              },
              {
                icon: BarChart,
                title: 'Real-Time Analytics',
                description: 'Track clicks, conversions, and earnings in your personal affiliate dashboard',
                gradient: 'from-orange-500 to-orange-600'
              },
              {
                icon: Sparkles,
                title: 'Marketing Materials',
                description: 'Professional banners, email templates, social graphics, and product screenshots',
                gradient: 'from-pink-500 to-pink-600'
              },
              {
                icon: Users,
                title: 'Dedicated Support',
                description: 'Get help from our affiliate team whenever you need guidance or resources',
                gradient: 'from-indigo-500 to-indigo-600'
              }
            ].map((benefit, index) => (
              <Card
                key={index}
                className="relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <CardHeader className="relative">
                  <div className={`w-14 h-14 bg-gradient-to-br ${benefit.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <benefit.icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl mb-2">{benefit.title}</CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    {benefit.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Earning Potential */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              Your Earning Potential
            </h2>
            <p className="text-lg text-gray-600">
              Earn 30% recurring commission on all paid subscriptions for 12 consecutive months
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter Plan */}
            <Card className="bg-white border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="text-center border-b border-gray-200 pb-4">
                <CardTitle className="text-2xl font-bold mb-2">Starter</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Monthly Subscription</div>
                  <div className="text-2xl font-bold text-gray-900">$9.00/mo</div>
                  <div className="text-sm text-gray-600 mt-2">Your commission: <span className="font-semibold text-gray-900">$2.70/mo</span></div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-600 mb-1">Annual Subscription</div>
                  <div className="text-2xl font-bold text-gray-900">
                    $7.20/mo
                    <span className="text-sm text-green-600 font-medium ml-2">(20% off)</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">Your commission: <span className="font-semibold text-gray-900">$25.92/year</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="bg-white border-2 border-purple-300 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="text-center border-b border-gray-200 pb-4">
                <CardTitle className="text-2xl font-bold mb-2">Professional</CardTitle>
                <div className="text-sm text-purple-600 font-semibold">Most Popular</div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Monthly Subscription</div>
                  <div className="text-2xl font-bold text-gray-900">$19.00/mo</div>
                  <div className="text-sm text-gray-600 mt-2">Your commission: <span className="font-semibold text-gray-900">$5.70/mo</span></div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-600 mb-1">Annual Subscription</div>
                  <div className="text-2xl font-bold text-gray-900">
                    $15.20/mo
                    <span className="text-sm text-green-600 font-medium ml-2">(20% off)</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">Your commission: <span className="font-semibold text-gray-900">$54.72/year</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="bg-white border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="text-center border-b border-gray-200 pb-4">
                <CardTitle className="text-2xl font-bold mb-2">Enterprise</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Monthly Subscription</div>
                  <div className="text-2xl font-bold text-gray-900">$29.00/mo</div>
                  <div className="text-sm text-gray-600 mt-2">Your commission: <span className="font-semibold text-gray-900">$8.70/mo</span></div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-600 mb-1">Annual Subscription</div>
                  <div className="text-2xl font-bold text-gray-900">
                    $23.20/mo
                    <span className="text-sm text-green-600 font-medium ml-2">(20% off)</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">Your commission: <span className="font-semibold text-gray-900">$83.52/year</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Commission paid monthly for 12 consecutive months from the customer&apos;s first payment
            </p>
          </div>
        </div>
      </section>

      {/* Who Should Apply */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              Perfect For
            </h2>
            <p className="text-lg text-gray-600">
              Our affiliate program is ideal for these audiences
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Social Media Marketers',
                description: 'Help your clients save time and recommend the best scheduling tool'
              },
              {
                title: 'Content Creators',
                description: 'YouTube, blog, Instagram - share with your audience what you use'
              },
              {
                title: 'SaaS Reviewers',
                description: 'Tech influencers reviewing productivity and business tools'
              },
              {
                title: 'Digital Agencies',
                description: 'Recommend SocialCal to clients who need social media management'
              },
              {
                title: 'Business Coaches',
                description: 'Educators helping entrepreneurs grow their online presence'
              },
              {
                title: 'Online Communities',
                description: 'Anyone with an audience interested in social media tools'
              },
            ].map((item, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500 bg-white">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">{item.title}</CardTitle>
                      <CardDescription className="text-base">{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Four simple steps to start earning commissions
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: '1',
                title: 'Apply to Join',
                description: 'Fill out our quick application form with your website/social media info',
                gradient: 'from-purple-500 to-purple-600'
              },
              {
                step: '2',
                title: 'Get Approved',
                description: 'We review applications within 2-3 business days and send you a welcome email',
                gradient: 'from-blue-500 to-blue-600'
              },
              {
                step: '3',
                title: 'Get Your Link',
                description: 'Access your dashboard, generate your unique affiliate link, and download marketing materials',
                gradient: 'from-indigo-500 to-indigo-600'
              },
              {
                step: '4',
                title: 'Start Earning',
                description: 'Share your link through content, social media, or ads. Earn 30% recurring commissions!',
                gradient: 'from-green-500 to-green-600'
              },
            ].map((item, index) => (
              <div key={index} className="flex gap-6 items-start">
                <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <span className="text-3xl font-bold text-white">{item.step}</span>
                </div>
                <div className="flex-1 bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                  <h3 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">
              Requirements & Guidelines
            </h2>

            <div className="space-y-4 mb-8">
              {[
                'Active website, blog, or social media presence with engaged audience',
                'Genuine interest in promoting SocialCal to your audience',
                'Comply with FTC disclosure guidelines for affiliate relationships',
                'No spam, misleading claims, or prohibited marketing tactics',
                'No bidding on SocialCal or brand terms in paid search',
              ].map((requirement, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 leading-relaxed">{requirement}</span>
                </div>
              ))}
            </div>

            <p className="text-gray-600 bg-purple-50 p-4 rounded-lg border border-purple-100">
              <strong>Note:</strong> You don&apos;t need to be a SocialCal customer to join, but we highly recommend it so you can authentically promote the product based on your own experience.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'When do I get paid?',
                a: 'Monthly payouts are processed 30 days after a referral subscribes. This allows time to account for any refunds. Minimum payout is $50.'
              },
              {
                q: 'What if someone cancels their subscription?',
                a: 'You continue earning commission for the full 12 months, even if the customer cancels. Already-paid commissions are yours to keep (unless refunded).'
              },
              {
                q: 'Can I promote on paid ads?',
                a: 'Yes! You can use paid advertising. However, you cannot bid on SocialCal or our brand terms in search engines.'
              },
              {
                q: 'Do I need to be a SocialCal customer?',
                a: 'Not required, but highly recommended. Using the product yourself helps you create authentic, compelling content that converts better.'
              },
              {
                q: 'How long does approval take?',
                a: 'We typically review applications within 2-3 business days. You will receive an email notification with next steps.'
              },
              {
                q: 'What marketing materials do you provide?',
                a: 'We provide banners, email templates, social media graphics, product screenshots, copy snippets, and more through your affiliate dashboard.'
              },
            ].map((faq, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="text-lg">{faq.q}</CardTitle>
                  <CardDescription className="text-base pt-2">{faq.a}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Apply now and join our growing community of affiliate partners earning passive income
          </p>

          <Button
            asChild
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-6 font-semibold shadow-2xl hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <a href={ENDORSELY_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              Apply to Join Program
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>

          <p className="mt-6 text-purple-100">
            Questions? Email us at <a href="mailto:support@socialcal.app" className="underline font-semibold hover:text-white">support@socialcal.app</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
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
                <li><Link href="/" scroll={false} className="hover:text-white">Home</Link></li>
                <li><Link href="/pricing" scroll={false} className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" scroll={false} className="hover:text-white">About</Link></li>
                <li><Link href="/blog" scroll={false} className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Partners</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/affiliate" scroll={false} className="hover:text-white">Affiliate Program</Link></li>
                <li><Link href="/affiliate/terms" scroll={false} className="hover:text-white">Affiliate Terms</Link></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/terms" scroll={false} className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" scroll={false} className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/contact" scroll={false} className="hover:text-white">Contact</Link></li>
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

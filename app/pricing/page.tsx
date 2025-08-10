'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Menu, ArrowRight, Sparkles, BarChart } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AuthModals } from '@/components/auth/auth-modals'

const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$9',
    monthlyPrice: 9,
    description: 'Perfect for individuals and small businesses',
    features: [
      'Up to 5 social accounts',
      'Unlimited posts',
      'Basic analytics',
      'Email support',
      '7-day free trial',
    ],
    gradient: 'from-gray-600 to-gray-700',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$19',
    monthlyPrice: 19,
    description: 'For growing businesses and teams',
    features: [
      'Up to 15 social accounts',
      'Unlimited posts',
      'Advanced analytics',
      'AI caption suggestions',
      'Priority support',
      'Team collaboration (3 users)',
      '7-day free trial',
    ],
    popular: true,
    gradient: 'from-purple-600 to-blue-600',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$29',
    monthlyPrice: 29,
    description: 'Everything you need for large teams',
    features: [
      'Unlimited social accounts',
      'Unlimited posts',
      'Advanced analytics & insights',
      'Unlimited AI suggestions',
      'Unlimited team members',
      'Dedicated account manager',
      'Custom integrations',
      'Priority support 24/7',
      '7-day free trial',
    ],
    gradient: 'from-blue-600 to-indigo-700',
  },
]

const faqs = [
  {
    question: 'Which social media platforms do you support?',
    answer: 'We support all major platforms including X (Twitter), Instagram, Facebook, LinkedIn, YouTube, TikTok, Threads, Bluesky, and Pinterest.',
  },
  {
    question: 'Can I customize content for each platform?',
    answer: 'Yes! You can customize your content for each platform before posting, ensuring your message is optimized for each audience.',
  },
  {
    question: 'How does the AI caption suggestion work?',
    answer: 'Our AI analyzes your content and suggests captions tailored to each platform\'s best practices and your brand voice.',
  },
  {
    question: 'Can I collaborate with my team?',
    answer: 'Absolutely! Our Professional and Enterprise plans include team collaboration features for content creation and approval workflows.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, we offer a 14-day free trial for all plans. No credit card required.',
  },
]

function PricingPageContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const [signUpPlanId, setSignUpPlanId] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    
    // Check URL parameters for modal triggers
    const shouldOpenSignIn = searchParams.get('signin') === 'true'
    const shouldOpenSignUp = searchParams.get('signup') === 'true'
    const planFromUrl = searchParams.get('plan')
    
    if (shouldOpenSignIn) {
      setSignInOpen(true)
      // Clean up URL
      router.replace('/pricing', { scroll: false })
    } else if (shouldOpenSignUp) {
      if (planFromUrl) {
        setSignUpPlanId(planFromUrl)
      }
      setSignUpOpen(true)
      // Clean up URL
      router.replace('/pricing', { scroll: false })
    }
  }, [searchParams, router])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
  }

  const handleStartTrial = async (planId: string) => {
    if (!isAuthenticated) {
      // Not logged in, open signup modal with plan
      setSignUpPlanId(planId)
      setSignUpOpen(true)
      return
    }

    // User is logged in, proceed to Stripe checkout
    setLoading(planId)
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-lg">
        <div className="container mx-auto px-6">
          <nav className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/SocialCal.png" 
                alt="SocialPulse Logo" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                SocialPulse
              </span>
            </Link>
            <div className="flex items-center space-x-1">
              <div className="hidden md:flex items-center space-x-1">
                <Link 
                  href="/#features" 
                  className="px-4 py-2 text-[15px] font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                >
                  Features
                </Link>
                <Link 
                  href="/pricing" 
                  className="px-4 py-2 text-[15px] font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                >
                  Pricing
                </Link>
              </div>
              {isAuthenticated ? (
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 ml-1"
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => setSignInOpen(true)}
                    className="text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 ml-2"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
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

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gradient-to-b from-white via-purple-50/30 to-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-700">LIMITED TIME OFFER</span>
            </div>
            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Start with a 7-day free trial. No credit card required.
            </p>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              Save up to 20% with annual billing. Switch between plans anytime.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 rounded-xl p-1 inline-flex">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingCycle === 'monthly' 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                  billingCycle === 'annual' 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Annual
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative ${plan.popular ? 'md:-mt-4' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                    <div className="bg-white border border-purple-200 text-purple-600 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                      MOST POPULAR
                    </div>
                  </div>
                )}
                <Card className={`h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  plan.popular ? 'border-2 border-purple-200 shadow-xl' : 'border border-gray-200'
                }`}>
                  <CardHeader className="pb-8 pt-8">
                    <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                    <CardDescription className="text-gray-600">{plan.description}</CardDescription>
                    <div className="mt-6">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-gray-900">
                          ${billingCycle === 'annual' 
                            ? Math.floor(plan.monthlyPrice * 0.8) 
                            : plan.monthlyPrice}
                        </span>
                        <span className="text-gray-500 ml-2">/month</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {billingCycle === 'annual' 
                          ? `Billed annually ($${Math.floor(plan.monthlyPrice * 0.8 * 12)}/year)` 
                          : 'Billed monthly'}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <div className="rounded-full bg-green-100 p-1 mr-3 mt-0.5">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full h-12 font-semibold text-base transition-all duration-200 ${
                        plan.popular 
                          ? `bg-gradient-to-r ${plan.gradient} hover:shadow-lg hover:scale-[1.02] text-white` 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                      onClick={() => handleStartTrial(plan.id)}
                      disabled={loading === plan.id}
                    >
                      {loading === plan.id ? (
                        'Loading...'
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Start Free Trial
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-16 text-center">
            <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>24/7 support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Everything you need to know about SocialPulse
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={faq.question} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {faq.question}
                      </CardTitle>
                      <CardDescription className="text-base text-gray-600 leading-relaxed">
                        {faq.answer}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <Button variant="outline" className="gap-2">
              Contact Support
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">SocialPulse</h3>
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
                <li><Link href="#" className="hover:text-white">About</Link></li>
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
            <p>&copy; 2024 SocialPulse. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <AuthModals
        signInOpen={signInOpen}
        signUpOpen={signUpOpen}
        onSignInOpenChange={setSignInOpen}
        onSignUpOpenChange={setSignUpOpen}
        signUpPlanId={signUpPlanId}
      />
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  )
}
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Menu, Sparkles, BarChart, ChevronDown, Clock, TrendingUp, Users, Layers, Zap } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AuthModals } from '@/components/auth/auth-modals'

import { MobileMenu } from '@/components/layout/mobile-menu'
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
    question: 'What does your scheduler actually do?',
    answer: 'Our platform helps creators, solopreneurs, and small teams schedule and manage their social media content across all major platforms — all from one clean, easy-to-use dashboard. You can plan posts, organize campaigns, schedule content in advance, and repurpose your top-performing posts across multiple channels — without logging into 5 different apps every day.',
  },
  {
    question: 'Who is this for?',
    answer: 'We built this for creators, small business owners, marketers, personal brands, and teams who want to stay consistent on social media — without wasting time. If you are posting across multiple platforms and tired of managing it all manually, this tool is for you.',
  },
  {
    question: 'What platforms do you support?',
    answer: 'We support all major platforms, including: X (formerly Twitter), Instagram, Facebook, LinkedIn, TikTok, YouTube (Shorts and Posts), Threads, Pinterest, and Bluesky. You can schedule to one or all — depending on your plan and workflow.',
  },
  {
    question: 'What makes your scheduler different from others?',
    answer: 'Simple: we are the most affordable scheduler for the features we offer. Most platforms charge you more as you grow. We do not. Our pricing is transparent, flat, and built to support creators — not agencies with huge budgets. We also designed this platform to be lightweight, fast, and intuitive — with none of the bloat, complexity, or unnecessary upsells.',
  },
  {
    question: 'Can I post to multiple platforms at once?',
    answer: 'Yes. You can schedule one post and push it to multiple platforms at the same time — or tailor it per platform to match the format and voice.',
  },
  {
    question: 'Can I customize posts per platform?',
    answer: 'Absolutely. You can tweak your copy, hashtags, formatting, or visuals for each platform in a single view — so you never have to sacrifice quality just to save time.',
  },
  {
    question: 'Do you offer analytics or performance insights?',
    answer: 'Basic performance tracking is included depending on your plan. You will be able to see post status, engagement metrics (likes, comments, views), and track what is working best. We are currently building deeper analytics and will be rolling out advanced insights soon.',
  },
  {
    question: 'Can I schedule Reels, Threads, or Shorts?',
    answer: 'Yes — we support all major content types including: Instagram Reels, TikTok videos, YouTube Shorts, Threads, Carousels, Single-image posts, and Facebook/LinkedIn native video. Stories support is on our roadmap.',
  },
  {
    question: 'Can I repurpose my content inside the scheduler?',
    answer: 'Yes. You can duplicate and adapt existing posts for different platforms with just a few clicks — no need to start over. This helps you show up everywhere without burning out.',
  },
  {
    question: 'What plans do you offer?',
    answer: 'We offer three simple pricing plans to fit any stage of your content journey. Each plan gives you a monthly or annual option and access to different posting volumes and platform support. You can compare the details directly on our Pricing Page.',
  },
  {
    question: 'How much does it cost?',
    answer: 'Our plans are designed to be the most affordable in the market — starting at just $7 per month. We are proud to give creators pro-level scheduling tools at a fraction of what other platforms charge.',
  },
  {
    question: 'Do you offer a free trial?',
    answer: 'Yes — we offer a 7-day free trial on all plans. No credit card required. Try the full app and see if it fits your workflow before committing.',
  },
  {
    question: 'Is there a money-back guarantee?',
    answer: 'Yes. If you decide the platform is not for you, we offer a 14-day no-questions-asked money-back guarantee on all paid plans. You have got nothing to lose by trying it out.',
  },
  {
    question: 'Can I upgrade, downgrade, or cancel anytime?',
    answer: 'Yes — you are in full control of your subscription. Upgrade or downgrade plans anytime directly from your account dashboard. Cancel anytime before your renewal date and you will not be charged again.',
  },
  {
    question: 'Do you offer customer support?',
    answer: 'Yes. We offer fast, human support via email. You will also find a growing knowledge base and tutorials to help you get the most out of the platform.',
  },
  {
    question: 'Can I suggest new features?',
    answer: 'Absolutely. We are building this product in collaboration with our users. If there is something you would love to see — let us know. Many of our current features were requested by creators just like you.',
  },
]

function PricingPageContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const [signUpPlanId, setSignUpPlanId] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<string>('professional')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    
    // Check URL parameters for modal triggers and scrolling
    const shouldOpenSignIn = searchParams.get('signin') === 'true'
    const shouldOpenSignUp = searchParams.get('signup') === 'true'
    const planFromUrl = searchParams.get('plan')
    const scrollTo = searchParams.get('scroll')
    
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
    
    // Handle smooth scrolling from other pages
    if (scrollTo) {
      // First scroll to top
      window.scrollTo(0, 0)
      
      // Then smoothly scroll to the target section
      setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) {
          const headerOffset = 80
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
        
        // Clean up URL after scrolling
        router.replace('/pricing', { scroll: false })
      }, 100)
    }
    
    // Handle hash navigation after page loads (for backward compatibility)
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const id = hash.substring(1)
        const element = document.getElementById(id)
        if (element) {
          const headerOffset = 80
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
  }, [searchParams, router])

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

  const handleNavClick = (href: string) => {
    if (href.startsWith('/#')) {
      router.push('/')
      setTimeout(() => {
        const id = href.substring(2)
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } else if (href === '#faq') {
      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
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
                <button 
                  onClick={() => handleNavClick('#faq')}
                  className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                >
                  FAQ
                </button>
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
                      onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-base font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 px-5 py-2"
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

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gradient-to-b from-white via-purple-50/30 to-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-700">14-Day Money-Back Guarantee</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              Plan, Schedule & Post — Without the Stress
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pick the perfect plan to automate your posting, free your time, and grow your audience on autopilot. Start with a 7-day free trial.
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
                className={`relative transition-all duration-300 ${
                  selectedPlan === plan.id ? 'md:-mt-2 md:scale-[1.02] z-10' : 'md:scale-[0.98]'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {selectedPlan === plan.id && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                    <div className="bg-white border border-purple-200 text-purple-600 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                      {plan.popular ? 'MOST POPULAR' : 'SELECTED'}
                    </div>
                  </div>
                )}
                <Card className={`h-full relative overflow-hidden transition-all duration-300 cursor-pointer ${
                  selectedPlan === plan.id 
                    ? 'border-2 border-purple-300 shadow-2xl' 
                    : 'border border-gray-200 hover:border-purple-200 hover:shadow-lg'
                }`}>
                  <CardHeader className="pb-8 pt-8">
                    <CardTitle className="text-2xl font-bold mb-2 text-gray-900">{plan.name}</CardTitle>
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
                        selectedPlan === plan.id 
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
                <span>14-day money back guarantee</span>
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
      <section id="faq" className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white scroll-mt-20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">Got Questions?</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about SocialCal and how it can transform your social media workflow
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={faq.question}
                className={`group relative transition-all duration-300 ${
                  expandedFaq === index ? 'mb-2' : ''
                }`}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className={`w-full text-left transition-all duration-300 ${
                    expandedFaq === index 
                      ? 'shadow-lg' 
                      : 'shadow-md hover:shadow-lg'
                  }`}
                >
                  <Card className={`border-0 overflow-hidden transition-all duration-300 ${
                    expandedFaq === index 
                      ? 'bg-gradient-to-br from-white to-blue-50/30 ring-2 ring-blue-100' 
                      : 'bg-white hover:bg-gray-50/50'
                  }`}>
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                            expandedFaq === index
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 group-hover:from-blue-100 group-hover:to-purple-100 group-hover:text-blue-700'
                          }`}>
                            {index + 1}
                          </div>
                          <CardTitle className={`text-lg font-semibold transition-colors duration-300 ${
                            expandedFaq === index ? 'text-gray-900' : 'text-gray-800 group-hover:text-gray-900'
                          }`}>
                            {faq.question}
                          </CardTitle>
                        </div>
                        <ChevronDown className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${
                          expandedFaq === index 
                            ? 'rotate-180 text-blue-600' 
                            : 'text-gray-400 group-hover:text-gray-600'
                        }`} />
                      </div>
                    </CardHeader>
                    {expandedFaq === index && (
                      <CardContent className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-300">
                        <div className="pl-14 pr-2">
                          <p className="text-gray-600 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <Button variant="outline" className="gap-2">
              Contact Support
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                <li><Link href="/?scroll=features" className="hover:text-white">Features</Link></li>
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
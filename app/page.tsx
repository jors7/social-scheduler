'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Calendar, Users, BarChart, Zap, Shield, Star, Menu } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AuthModals } from '@/components/auth/auth-modals'

const platforms = [
  { name: 'X (Twitter)', icon: '𝕏' },
  { name: 'Instagram', icon: '📷' },
  { name: 'Facebook', icon: 'f' },
  { name: 'LinkedIn', icon: 'in' },
  { name: 'YouTube', icon: '▶' },
  { name: 'TikTok', icon: '♪' },
  { name: 'Threads', icon: '@' },
  { name: 'Bluesky', icon: '🦋' },
  { name: 'Pinterest', icon: 'P' },
]

const features = [
  {
    title: 'Multi-Platform Publishing',
    description: 'Post to all your social media accounts with one click',
    icon: Zap,
  },
  {
    title: 'Smart Scheduling',
    description: 'Schedule posts in advance for optimal engagement times',
    icon: Calendar,
  },
  {
    title: 'AI Caption Suggestions',
    description: 'Get AI-powered caption suggestions tailored to each platform',
    icon: Users,
  },
  {
    title: 'Analytics Dashboard',
    description: 'Track performance across all platforms in one place',
    icon: BarChart,
  },
  {
    title: 'Platform Customization',
    description: 'Customize content for each platform before posting',
    icon: Shield,
  },
  {
    title: 'Team Collaboration',
    description: 'Work with your team to create and approve content',
    icon: Users,
  },
]

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Marketing Director',
    content: 'Social Scheduler has transformed how we manage our social media presence. We save hours every week!',
    rating: 5,
  },
  {
    name: 'Mike Chen',
    role: 'Content Creator',
    content: 'The AI caption suggestions are incredible. They help me maintain consistency across all platforms.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Small Business Owner',
    content: 'Finally, a tool that makes social media manageable for small businesses. Highly recommend!',
    rating: 5,
  },
]

const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$9',
    description: 'Perfect for individuals and small businesses',
    features: [
      'Up to 5 social accounts',
      'Unlimited posts',
      'Basic analytics',
      '7-day free trial',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$19',
    description: 'For growing businesses and teams',
    features: [
      'Up to 15 social accounts',
      'Unlimited posts',
      'Advanced analytics',
      'AI caption suggestions',
      'Priority support',
      '7-day free trial',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$29',
    description: 'Everything you need for large teams',
    features: [
      'Unlimited social accounts',
      'Unlimited posts',
      'Advanced analytics',
      'Unlimited AI suggestions',
      'Team collaboration',
      'Priority support',
      '7-day free trial',
    ],
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

function LandingPageContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const [signUpPlanId, setSignUpPlanId] = useState<string | null>(null)
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
      router.replace('/', { scroll: false })
    } else if (shouldOpenSignUp) {
      if (planFromUrl) {
        setSignUpPlanId(planFromUrl)
      }
      setSignUpOpen(true)
      // Clean up URL
      router.replace('/', { scroll: false })
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
          billingCycle: 'monthly', // Default to monthly
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

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing')
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-2xl font-bold text-primary">
                Social Scheduler
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <Link href="#features" className="text-sm font-medium hover:text-primary">
                  Features
                </Link>
                <Link href="#pricing" className="text-sm font-medium hover:text-primary">
                  Pricing
                </Link>
                <Link href="#faq" className="text-sm font-medium hover:text-primary">
                  FAQ
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Dashboard
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setSignInOpen(true)}>
                  Login
                </Button>
              )}
              <Button onClick={scrollToPricing}>
                Start Free Trial
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Schedule Posts Across All
            <span className="text-primary"> Social Media Platforms</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Manage all your social media accounts from one dashboard. Schedule, post, and analyze your content across multiple platforms with ease.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8" onClick={scrollToPricing}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 items-center">
            <p className="text-sm text-gray-500">Supports:</p>
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg font-bold text-gray-700"
                title={platform.name}
              >
                {platform.icon}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Everything You Need to Manage Social Media
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Trusted by Thousands of Users
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name}>
                <CardHeader>
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardDescription className="text-base">
                    &ldquo;{testimonial.content}&rdquo;
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Start with a 7-day free trial. No credit card required.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.popular ? 'border-primary shadow-lg scale-105' : ''}
              >
                {plan.popular && (
                  <div className="bg-primary text-white text-center py-2 rounded-t-lg">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== 'Custom' && <span className="text-gray-500">/month</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleStartTrial(plan.id)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Loading...' : 'Start Free Trial'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {faq.answer}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Social Scheduler</h3>
              <p className="text-gray-400">
                The all-in-one social media management platform for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
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
            <p>&copy; 2024 Social Scheduler. All rights reserved.</p>
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

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  )
}
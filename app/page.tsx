'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, BarChart, Zap, Shield, Menu, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AuthModals } from '@/components/auth/auth-modals'
import { CapabilitiesCarousel } from '@/components/landing/capabilities-carousel'

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
  // First row testimonials
  [
    "SocialPulse has completely transformed our social media strategy. We're saving 15+ hours every week!",
    "The AI suggestions are spot on! My engagement has increased by 200% in just two months.",
    "Finally, a tool that understands small businesses. Simple, powerful, and affordable.",
    "Scheduling across 9 platforms used to be a nightmare. Now it takes me 10 minutes.",
    "The analytics dashboard alone is worth the price. I can finally track ROI properly.",
    "My team loves how intuitive everything is. Zero learning curve!",
  ],
  // Second row testimonials
  [
    "Game-changer for content creators! I can focus on creating instead of posting.",
    "Doubled my client base since using SocialPulse. The time savings are incredible.",
    "The bulk upload feature is a lifesaver. I schedule a month's content in one go.",
    "Customer support is exceptional. They actually listen and implement feedback.",
    "Best investment for my personal brand. Period.",
    "Switched from Hootsuite and never looked back. This is so much better!",
  ],
]


function LandingPageContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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


  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-10">
              <Link href="/" className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  SocialPulse
                </span>
              </Link>
              <div className="hidden md:flex items-center space-x-1">
                <Link 
                  href="#features" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                >
                  Features
                </Link>
                <Link 
                  href="/pricing" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                >
                  Pricing
                </Link>
                <Link 
                  href="#testimonials" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                >
                  Testimonials
                </Link>
                <Link 
                  href="#contact" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                >
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
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
                    onClick={() => router.push('/pricing')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
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

      {/* Hero Section */}
      <section className="relative py-16 px-4 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute top-40 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
          </div>
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* Main headline with gradient */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
              <span className="text-gray-900">Schedule</span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                Everywhere
              </span>
              <br />
              <span className="text-gray-900">at Once</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              One click. Nine platforms. Unlimited possibilities.
              <br className="hidden md:block" />
              Save 15+ hours weekly on social media management.
            </p>
            
            {/* CTA buttons with better styling */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => router.push('/pricing')}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-6 rounded-xl border-2 hover:bg-gray-50 transition-all duration-200"
              >
                <Clock className="mr-2 h-5 w-5" />
                Watch 2-min Demo
              </Button>
            </div>
            
            {/* Platform icons in a more elegant grid */}
            <div className="relative">
              <p className="text-sm text-gray-500 mb-6 font-medium uppercase tracking-wider">Works seamlessly with</p>
              <div className="flex flex-wrap justify-center gap-4">
                {platforms.map((platform, index) => (
                  <div
                    key={platform.name}
                    className="group relative"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center w-14 h-14 bg-white rounded-xl shadow-sm group-hover:shadow-lg transform group-hover:-translate-y-1 transition-all duration-300 border border-gray-100">
                      <span className="text-xl font-bold text-gray-700 group-hover:text-gray-900">
                        {platform.icon}
                      </span>
                    </div>
                    <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                      {platform.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="relative bg-white py-12 px-4 overflow-hidden min-h-[500px]">
        {/* Purple gradient background under the curve */}
        <div className="absolute inset-0 pointer-events-none">
          <svg 
            className="w-full h-full" 
            viewBox="0 0 1440 500" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            {/* Gradient fill under the curve - more curved */}
            <path 
              d="M0,500 C200,480 400,450 600,400 C800,350 1000,250 1200,100 C1320,25 1380,5 1440,0 L1440,500 L0,500 Z" 
              fill="url(#purpleGradientFill)"
              opacity="1"
            />
            {/* Curve line - more curved */}
            <path 
              d="M0,500 C200,480 400,450 600,400 C800,350 1000,250 1200,100 C1320,25 1380,5 1440,0" 
              stroke="url(#purpleGradientStroke)" 
              strokeWidth="3" 
              fill="none"
              opacity="0.3"
              id="curvePath"
            />
            {/* Dots on the curve - using exact curve calculations */}
            <circle cx="0" cy="500" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="300" cy="460" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="600" cy="400" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="900" cy="290" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="1200" cy="100" r="2" fill="#9333ea" opacity="0.8" />
            <circle cx="1440" cy="0" r="2" fill="#9333ea" opacity="0.8" />
            <defs>
              <linearGradient id="purpleGradientFill" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f3e8ff" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#e9d5ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f3e8ff" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="purpleGradientStroke" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9333ea" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#9333ea" stopOpacity="0.5" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Content above the curve - positioned much higher */}
        <div className="container mx-auto max-w-6xl relative z-10 pb-32">
          <div className="text-left mb-6">
            <h2 className="text-4xl md:text-5xl font-bold mb-3 text-gray-900">
              What&apos;s the SocialPulse impact?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              SocialPulse will save your team hours of work (and lots of headaches) every week
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-0 max-w-3xl">
            {/* Save Time Metric */}
            <div className="flex flex-col items-start px-4 py-4 md:border-r border-gray-200">
              <div className="mb-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">15x</span>
              </div>
              <h3 className="text-base font-semibold mb-1 text-gray-900">Save time</h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Create and schedule your social media content 15x faster.
              </p>
            </div>

            {/* Get Answers Faster Metric */}
            <div className="flex flex-col items-start px-4 py-4 md:border-r border-gray-200">
              <div className="mb-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">67%</span>
              </div>
              <h3 className="text-base font-semibold mb-1 text-gray-900">Get answers faster</h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Find and manage all your posts 67% faster.
              </p>
            </div>

            {/* Increase Productivity Metric */}
            <div className="flex flex-col items-start px-4 py-4">
              <div className="mb-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">25%</span>
              </div>
              <h3 className="text-base font-semibold mb-1 text-gray-900">Increase productivity</h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Boost your team&apos;s social media productivity by 25%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Carousel Section */}
      <CapabilitiesCarousel />

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

      {/* Horizontal Scrolling Testimonials Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden relative">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Loved by content creators worldwide
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto">
            Join thousands of satisfied users who have transformed their social media game
          </p>
        </div>
        
        {/* First row - scrolling left to right */}
        <div className="relative mb-8">
          <div className="flex animate-scroll-right">
            {/* Duplicate the testimonials for seamless loop */}
            {[...testimonials[0], ...testimonials[0]].map((testimonial, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[380px] mx-3"
              >
                <Card className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 h-[120px] border-gray-100">
                  <CardContent className="h-full flex items-center justify-center p-5">
                    <p className="text-gray-600 text-sm leading-relaxed font-normal text-center">
                      {testimonial}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          {/* Fade gradients on both sides */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10" />
        </div>
        
        {/* Second row - scrolling right to left */}
        <div className="relative">
          <div className="flex animate-scroll-left">
            {/* Duplicate the testimonials for seamless loop */}
            {[...testimonials[1], ...testimonials[1]].map((testimonial, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[380px] mx-3"
              >
                <Card className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 h-[120px] border-gray-100">
                  <CardContent className="h-full flex items-center justify-center p-5">
                    <p className="text-gray-600 text-sm leading-relaxed font-normal text-center">
                      {testimonial}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          {/* Fade gradients on both sides */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10" />
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
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
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
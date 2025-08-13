'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, BarChart, Zap, Shield, Menu, Clock, TrendingUp, ArrowRight, Layers, Sparkles, ChevronRight } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AuthModals } from '@/components/auth/auth-modals'
import { CapabilitiesCarousel } from '@/components/landing/capabilities-carousel'

const platforms = [
  { name: 'X (Twitter)', icon: '𝕏' },
  { name: 'Instagram', icon: '📸' },
  { name: 'Facebook', icon: 'f' },
  { name: 'LinkedIn', icon: 'in' },
  { name: 'YouTube', icon: '▶' },
  { name: 'TikTok', icon: '♫' },
  { name: 'Threads', icon: '@' },
  { name: 'Bluesky', icon: '🦋' },
  { name: 'Pinterest', icon: '📌' },
]

const features = [
  {
    title: 'Multi-Platform Publishing',
    description: 'Post to all your social media accounts with one click. Save time and maintain consistency across all platforms.',
    icon: Zap,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Smart Scheduling',
    description: 'Schedule posts in advance for optimal engagement times. Our AI analyzes your audience for the best posting schedule.',
    icon: Calendar,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    title: 'AI Caption Suggestions',
    description: 'Get AI-powered caption suggestions tailored to each platform. Boost engagement with optimized content.',
    icon: Sparkles,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    title: 'Analytics Dashboard',
    description: 'Track performance across all platforms in one place. Get insights to improve your social media strategy.',
    icon: BarChart,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Content Library',
    description: 'Store and organize your media assets. Access your images, videos, and templates anytime from anywhere.',
    icon: Layers,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    title: 'Team Collaboration',
    description: 'Work with your team to create and approve content. Assign roles, review drafts, and streamline your workflow.',
    icon: Users,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    isPro: true,
  },
]

const testimonials = [
  // First row testimonials
  [
    "SocialCal has completely transformed our social media strategy. We're saving 15+ hours every week!",
    "The AI suggestions are spot on! My engagement has increased by 200% in just two months.",
    "Finally, a tool that understands small businesses. Simple, powerful, and affordable.",
    "Scheduling across 9 platforms used to be a nightmare. Now it takes me 10 minutes.",
    "The analytics dashboard alone is worth the price. I can finally track ROI properly.",
    "My team loves how intuitive everything is. Zero learning curve!",
  ],
  // Second row testimonials
  [
    "Game-changer for content creators! I can focus on creating instead of posting.",
    "Doubled my client base since using SocialCal. The time savings are incredible.",
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
                  href="#features" 
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
                  <button 
                    onClick={() => setSignInOpen(true)}
                    className="text-base font-semibold text-gray-600 hover:text-gray-900 transition-all duration-200"
                  >
                    Sign In
                  </button>
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

      {/* Hero Section - Two Column Layout */}
      <section className="relative pt-12 pb-10 px-4 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute top-40 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
          </div>
        </div>
        
        <div className="max-w-[1500px] mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-0 items-center justify-center lg:pl-8">
            {/* Left Column - Text Content */}
            <div className="max-w-[600px]">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full mb-3 shadow-md">
                <span className="text-yellow-500 text-lg">✨</span>
                <span className="text-indigo-700 font-semibold text-sm">All-in-One Scheduler</span>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold mb-4 leading-tight text-gray-900">
                Post Your Content Everywhere
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed">
                One click. Nine platforms. Unlimited possibilities.
                <br className="hidden md:block" />
                Save 15+ hours weekly on social media management.
              </p>
              
              {/* CTA button */}
              <div className="mb-8">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xl px-12 py-7 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  onClick={() => router.push('/pricing')}
                >
                  Start Free Trial
                </Button>
              </div>
            </div>
            
            {/* Right Column - Hero Image */}
            <div className="w-full max-w-[900px] lg:-ml-32">
              <img 
                src="/hero-dashboard.png"
                alt="SocialCal Dashboard"
                className="w-full h-auto scale-[1.2] origin-left"
              />
            </div>
          </div>
          
          {/* Platform icons - moved to center */}
          <div className="text-center mt-16 pb-6">
            <p className="text-sm text-gray-500 mb-6 font-medium uppercase tracking-wider">Works seamlessly with</p>
            <div className="flex flex-wrap justify-center gap-4">
              {platforms.map((platform, index) => (
                <div
                  key={platform.name}
                  className="group relative mb-6"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center w-14 h-14 bg-white rounded-xl shadow-sm group-hover:shadow-lg transform group-hover:-translate-y-1 transition-all duration-300 border border-gray-100">
                    <span className="text-xl font-bold text-gray-700 group-hover:text-gray-900">
                      {platform.icon}
                    </span>
                  </div>
                  <span className="absolute top-16 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                    {platform.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Carousel Section - MOVED UP */}
      <CapabilitiesCarousel />

      {/* Impact Section - MOVED DOWN */}
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
            <h2 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
              What&apos;s the SocialCal impact?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              SocialCal will save your team hours of work (and lots of headaches) every week
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-0 max-w-3xl">
            {/* Save Time Metric */}
            <div className="flex flex-col items-start px-4 py-4 md:border-r border-gray-200">
              <div className="mb-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">15x</span>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-gray-900">Save time</h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Create and schedule your social media content 15x faster.
              </p>
            </div>

            {/* Get Answers Faster Metric */}
            <div className="flex flex-col items-start px-4 py-4 md:border-r border-gray-200">
              <div className="mb-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">67%</span>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-gray-900">Get answers faster</h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Find and manage all your posts 67% faster.
              </p>
            </div>

            {/* Increase Productivity Metric */}
            <div className="flex flex-col items-start px-4 py-4">
              <div className="mb-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">25%</span>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-gray-900">Increase productivity</h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Boost your team&apos;s social media productivity by 25%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced Design */}
      <section id="features" className="py-24 px-4 bg-gradient-to-b from-white via-gray-50/50 to-white">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full mb-4">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 font-semibold text-sm">Core Features</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to streamline your social media workflow and boost engagement
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="group relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Gradient border effect on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
                
                {/* Card Content */}
                <div className="relative h-full p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
                  {/* Title with Icon and Badge */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      {/* Icon */}
                      <div className={`p-2.5 rounded-lg ${feature.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 flex-1">
                        {feature.title}
                      </h3>
                      
                      {/* Pro Badge */}
                      {feature.isPro && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-sm">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-gray-600 mb-6">
              Ready to transform your social media strategy?
            </p>
            <Link href="/pricing">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
              Get Started Free
            </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Horizontal Scrolling Testimonials Section */}
      <section className="py-20 overflow-hidden relative">
        {/* Animated gradient background with white at top for smooth transition */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/30 to-purple-50">
          <div className="absolute inset-0">
            <div className="absolute top-40 right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob"></div>
            <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob animation-delay-4000"></div>
          </div>
        </div>
        
        <div className="relative z-10 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-4 text-gray-900">
            Loved by content creators worldwide
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto">
            Join thousands of satisfied users who have transformed their social media game
          </p>
        </div>
        
        {/* First row - scrolling left to right */}
        <div className="relative z-10 mb-8">
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
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
        </div>
        
        {/* Second row - scrolling right to left */}
        <div className="relative z-10">
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
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
        </div>
      </section>

      {/* Footer */}
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
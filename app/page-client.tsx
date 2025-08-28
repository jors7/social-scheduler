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
import HowItWorksSection from '@/components/landing/how-it-works-section'
import GradientCTA from '@/components/landing/gradient-cta'
import { MobileMenu } from '@/components/layout/mobile-menu'
import Script from 'next/script'

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SocialCal",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "All-in-one social media management platform for scheduling posts across 9+ platforms with AI-powered captions and analytics",
  "url": "https://www.socialcal.app",
  "image": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp",
  "screenshot": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp",
  "creator": {
    "@type": "Organization",
    "name": "SocialCal",
    "url": "https://www.socialcal.app"
  },
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "USD",
    "lowPrice": "9",
    "highPrice": "29",
    "offerCount": "3",
    "offers": [
      {
        "@type": "Offer",
        "name": "Starter Plan",
        "price": "9",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "9",
          "priceCurrency": "USD",
          "billingIncrement": 1,
          "unitCode": "MON"
        }
      },
      {
        "@type": "Offer",
        "name": "Professional Plan",
        "price": "19",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "19",
          "priceCurrency": "USD",
          "billingIncrement": 1,
          "unitCode": "MON"
        }
      },
      {
        "@type": "Offer",
        "name": "Enterprise Plan",
        "price": "29",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "29",
          "priceCurrency": "USD",
          "billingIncrement": 1,
          "unitCode": "MON"
        }
      }
    ]
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "1250",
    "bestRating": "5",
    "worstRating": "1"
  },
  "featureList": [
    "Multi-platform posting to 9+ social networks",
    "AI-powered caption generation",
    "Content scheduling and calendar",
    "Analytics and performance tracking",
    "Team collaboration tools",
    "Media library management",
    "Draft management system",
    "Automated posting",
    "Rich text editor"
  ]
}

const organizationData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "SocialCal",
  "url": "https://www.socialcal.app",
  "logo": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp",
  "sameAs": [
    "https://twitter.com/socialcal",
    "https://www.facebook.com/socialcal",
    "https://www.linkedin.com/company/socialcal"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "",
    "contactType": "customer support",
    "email": "support@socialcal.app",
    "availableLanguage": "English"
  }
}

const faqData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What social media platforms does SocialCal support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SocialCal supports posting to Twitter/X, Instagram, Facebook, LinkedIn, YouTube, TikTok, Threads, Bluesky, and Pinterest - all from one dashboard."
      }
    },
    {
      "@type": "Question",
      "name": "How much time can SocialCal save me?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our users report saving 15+ hours weekly on social media management. You can create and schedule content 15x faster with our platform."
      }
    },
    {
      "@type": "Question",
      "name": "Does SocialCal offer AI features?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! SocialCal includes AI-powered caption suggestions with multiple tones (Professional, Casual, Funny, Inspirational), smart hashtag generation, and platform-optimized content recommendations."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a free trial available?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, SocialCal offers a 7-day free trial on all plans. No credit card required to start."
      }
    }
  ]
}

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
    title: 'Draft Management',
    description: 'Save your ideas as drafts and perfect them over time. Organize, search, and quickly turn drafts into scheduled posts.',
    icon: Shield,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const [signUpPlanId, setSignUpPlanId] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    
    // Check if we're coming back from OAuth callback
    const isOAuthCallback = window.location.hash?.includes('access_token') || 
                           searchParams.get('code') !== null
    
    // Set up auth state listener for OAuth redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && isOAuthCallback) {
        // User just signed in via OAuth, redirect to dashboard
        router.push('/dashboard')
      }
    })
    
    // Check URL parameters for modal triggers
    const shouldOpenSignIn = searchParams.get('signin') === 'true'
    const shouldOpenSignUp = searchParams.get('signup') === 'true'
    const planFromUrl = searchParams.get('plan')
    const scrollTo = searchParams.get('scroll')
    
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
    
    // Handle scroll parameter for smooth scrolling from other pages
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
        router.replace('/', { scroll: false })
      }, 100)
    }
    
    // Handle hash navigation for smooth scrolling (for FAQ links, etc)
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
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [searchParams, router])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
    setUserEmail(user?.email || null)
  }




  return (
    <>
      {/* Structured Data for SEO */}
      <Script
        id="structured-data-application"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Script
        id="structured-data-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <Script
        id="structured-data-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
      
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
                <button 
                  onClick={() => {
                    const element = document.getElementById('features')
                    if (element) {
                      const headerOffset = 80
                      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
                      const offsetPosition = elementPosition - headerOffset
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      })
                    }
                  }}
                  className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                  style={{ 
                    fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}
                >
                  Features
                </button>
                <button 
                  onClick={() => {
                    const element = document.getElementById('platforms')
                    if (element) {
                      const headerOffset = 80
                      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
                      const offsetPosition = elementPosition - headerOffset
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      })
                    }
                  }}
                  className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                  style={{ 
                    fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}
                >
                  Platforms
                </button>
                <Link 
                  href="/pricing" 
                  className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                  style={{ 
                    fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}
                >
                  Pricing
                </Link>
                <Link 
                  href="/pricing?scroll=faq"
                  className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                  style={{ 
                    fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}
                >
                  FAQ
                </Link>
                <Link 
                  href="/privacy" 
                  className="text-base font-medium text-gray-700 hover:text-purple-600 transition-all duration-200"
                  style={{ 
                    fontFamily: '"Vanquish W00 Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}
                >
                  Privacy
                </Link>
              </div>
              {/* Desktop buttons - hidden on mobile */}
              <div className="hidden md:flex items-center space-x-4">
                {isAuthenticated === null ? (
                  <div className="w-48 h-10" />
                ) : isAuthenticated ? (
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/dashboard')}
                    className="border border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                  >
                    <BarChart className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => setSignInOpen(true)}
                      className="text-base font-medium border border-blue-500 text-blue-500 hover:bg-blue-50 transition-all duration-200 px-6 py-2"
                    >
                      Sign In
                    </Button>
                    <Button 
                      onClick={() => router.push('/pricing')}
                      className="text-base font-medium bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 px-6 py-2"
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

      {/* Hero Section - Two Column Layout */}
      <section className="relative pt-4 pb-10 px-4 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute top-40 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
          </div>
        </div>
        
        <div className="max-w-[1500px] mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-0 items-center justify-center lg:pl-32">
            {/* Left Column - Text Content */}
            <div className="max-w-[600px]">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full mb-3 shadow-md">
                <span className="text-yellow-500 text-lg">✨</span>
                <span className="text-indigo-700 font-semibold text-sm">All-in-One Scheduler</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 leading-tight text-gray-900">
                Post Your Content Everywhere
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed">
                One click.
                <br />
                Nine platforms.
                <br />
                Unlimited possibilities.
                <br />
                Save 15+ hours weekly on social media management.
              </p>
              
              {/* CTA button */}
              <div className="mb-8">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-lg font-semibold px-12 py-7 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  onClick={() => router.push('/pricing')}
                  style={{ 
                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                    fontWeight: 600,
                    letterSpacing: '-0.01em'
                  }}
                >
                  Start Free Trial
                </Button>
                <p className="mt-4 text-sm text-gray-500">
                  By signing up, you agree to our{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
            
            {/* Right Column - Hero Image */}
            <div className="w-full max-w-[900px] lg:-ml-20 lg:mt-4">
              <img 
                src="https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp"
                alt="SocialCal Dashboard"
                className="w-full h-auto scale-[1.24] origin-left"
              />
            </div>
          </div>
          
          {/* Platform icons - moved to center */}
          <div className="text-center mt-16 pb-2 px-4">
            <p className="text-sm text-gray-500 mb-6 font-medium uppercase tracking-wider">Works seamlessly with</p>
            {/* Mobile: Two rows with centered bottom row, Desktop: Single row */}
            <div className="sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
              {/* First row - 5 icons on mobile */}
              <div className="grid grid-cols-5 gap-3 mb-3 sm:contents">
                {platforms.slice(0, 5).map((platform, index) => (
                  <div
                    key={platform.name}
                    className="group relative sm:mb-6"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl shadow-sm group-hover:shadow-lg transform group-hover:-translate-y-1 transition-all duration-300 border border-gray-100">
                      <span className="text-lg sm:text-xl font-bold text-gray-700 group-hover:text-gray-900">
                        {platform.icon}
                      </span>
                    </div>
                    <span className="absolute top-14 sm:top-16 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                      {platform.name}
                    </span>
                  </div>
                ))}
              </div>
              {/* Second row - 4 icons on mobile, centered */}
              <div className="flex justify-center gap-3 sm:contents">
                {platforms.slice(5).map((platform, index) => (
                  <div
                    key={platform.name}
                    className="group relative sm:mb-6"
                    style={{ animationDelay: `${(index + 5) * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl shadow-sm group-hover:shadow-lg transform group-hover:-translate-y-1 transition-all duration-300 border border-gray-100">
                      <span className="text-lg sm:text-xl font-bold text-gray-700 group-hover:text-gray-900">
                        {platform.icon}
                      </span>
                    </div>
                    <span className="absolute top-14 sm:top-16 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                      {platform.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Carousel Section - MOVED UP */}
      <CapabilitiesCarousel />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Impact Section - MOVED DOWN */}
      <section className="relative bg-white pt-24 pb-12 px-4 overflow-hidden min-h-[600px] md:min-h-[500px]">
        {/* Purple gradient background under the curve - adjusted for mobile */}
        <div className="absolute inset-0 pointer-events-none">
          <svg 
            className="w-full h-full" 
            viewBox="0 0 1440 500" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            {/* Mobile: Move curve lower, Desktop: Keep original */}
            <g className="block md:hidden">
              {/* Mobile curve - starts much lower */}
              <path 
                d="M0,500 C200,490 400,480 600,460 C800,440 1000,380 1200,300 C1320,250 1380,220 1440,200 L1440,500 L0,500 Z" 
                fill="url(#purpleGradientFillMobile)"
                opacity="1"
              />
              <path 
                d="M0,500 C200,490 400,480 600,460 C800,440 1000,380 1200,300 C1320,250 1380,220 1440,200" 
                stroke="url(#purpleGradientStrokeMobile)" 
                strokeWidth="2" 
                fill="none"
                opacity="0.3"
              />
            </g>
            <g className="hidden md:block">
              {/* Desktop curve - original */}
              <path 
                d="M0,500 C200,480 400,450 600,400 C800,350 1000,250 1200,100 C1320,25 1380,5 1440,0 L1440,500 L0,500 Z" 
                fill="url(#purpleGradientFill)"
                opacity="1"
              />
              <path 
                d="M0,500 C200,480 400,450 600,400 C800,350 1000,250 1200,100 C1320,25 1380,5 1440,0" 
                stroke="url(#purpleGradientStroke)" 
                strokeWidth="3" 
                fill="none"
                opacity="0.3"
              />
              {/* Dots on the curve - desktop only */}
              <circle cx="0" cy="500" r="2" fill="#9333ea" opacity="0.8" />
              <circle cx="300" cy="460" r="2" fill="#9333ea" opacity="0.8" />
              <circle cx="600" cy="400" r="2" fill="#9333ea" opacity="0.8" />
              <circle cx="900" cy="290" r="2" fill="#9333ea" opacity="0.8" />
              <circle cx="1200" cy="100" r="2" fill="#9333ea" opacity="0.8" />
              <circle cx="1440" cy="0" r="2" fill="#9333ea" opacity="0.8" />
            </g>
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
              <linearGradient id="purpleGradientFillMobile" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f3e8ff" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#e9d5ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f3e8ff" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="purpleGradientStrokeMobile" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9333ea" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#9333ea" stopOpacity="0.5" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Content above the curve - with more padding on mobile */}
        <div className="container mx-auto max-w-6xl relative z-10 pb-48 md:pb-32">
          <div className="text-left mb-6">
            <h2 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
              What&apos;s the SocialCal impact?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl">
              <span className="block sm:inline">SocialCal will save your team hours of work</span>
              <span className="block sm:inline"> (and lots of headaches) every week</span>
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-0 max-w-3xl">
            {/* Save Time Metric */}
            <div className="flex flex-col items-start px-4 py-6 sm:py-4 md:border-r border-gray-200 border-b md:border-b-0">
              <div className="mb-3">
                <span className="text-5xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">15x</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Save time</h3>
              <p className="text-gray-600 text-sm sm:text-xs leading-relaxed">
                Create and schedule your social media <br className="hidden sm:inline" />
                content 15x faster.
              </p>
            </div>

            {/* Get Answers Faster Metric */}
            <div className="flex flex-col items-start px-4 py-6 sm:py-4 md:border-r border-gray-200 border-b md:border-b-0">
              <div className="mb-3">
                <span className="text-5xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">67%</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Get answers faster</h3>
              <p className="text-gray-600 text-sm sm:text-xs leading-relaxed">
                Find and manage all your posts <br className="hidden sm:inline" />
                67% faster.
              </p>
            </div>

            {/* Increase Productivity Metric */}
            <div className="flex flex-col items-start px-4 py-6 sm:py-4">
              <div className="mb-3">
                <span className="text-5xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">25%</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Boost productivity</h3>
              <p className="text-gray-600 text-sm sm:text-xs leading-relaxed">
                Increase your productivity <br className="hidden sm:inline" />
                by 25%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced Design */}
      <section id="features" className="py-24 px-4 bg-gradient-to-b from-white via-gray-50/50 to-white scroll-mt-20">
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
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                        {feature.title}
                      </h3>
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

      {/* Supported Platforms Section */}
      <section id="platforms" className="py-6 pb-24 px-4 bg-gradient-to-b from-white to-gray-50 scroll-mt-20">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-[28px] sm:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
              Supported Platforms
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Use SocialCal to schedule and post your content across all of these social media platforms at the same time - all from one place.
            </p>
          </div>

          {/* Platform Logos Grid */}
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4 lg:gap-6">
            {/* Twitter/X */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000000"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium group-hover:text-gray-900">X (Twitter)</span>
            </div>

            {/* Instagram */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FED576"/>
                    <stop offset="26%" stopColor="#F47133"/>
                    <stop offset="61%" stopColor="#BC3081"/>
                    <stop offset="100%" stopColor="#4F5BD5"/>
                  </linearGradient>
                  <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient)"/>
                  <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="2"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
                  <rect x="5" y="5" width="14" height="14" rx="3.5" stroke="white" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium group-hover:text-gray-900">Instagram</span>
            </div>

            {/* Facebook */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium group-hover:text-gray-900">Facebook</span>
            </div>

            {/* LinkedIn */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium group-hover:text-gray-900">LinkedIn</span>
            </div>

            {/* TikTok */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.896 2.896 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" fill="#000000"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium group-hover:text-gray-900">TikTok</span>
            </div>

            {/* YouTube */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="5" width="20" height="14" rx="3" fill="#FF0000"/>
                  <path d="M10 9V15L15 12L10 9Z" fill="white"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium group-hover:text-gray-900">YouTube</span>
            </div>

            {/* Threads */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <svg className="w-10 h-10" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5625 90.4659 58.8257 97.2286 58.8257C97.3046 58.8257 97.381 58.8268 97.4577 58.8279C106.323 58.8882 114.536 63.0941 119.777 70.3394C122.844 74.6121 124.605 79.7724 124.93 85.5369C122.224 84.9795 119.436 84.6932 116.596 84.6932C96.757 84.6932 77.463 94.5173 77.463 111.79C77.463 126.742 89.543 134.814 103.328 134.814C120.162 134.814 130.629 124.949 130.629 111.708C130.629 110.765 130.578 109.836 130.478 108.925C132.065 109.611 133.618 110.397 135.087 111.275C141.243 114.894 144.242 118.663 144.242 124.13C144.242 128.884 142.013 133.534 138.23 136.933C131.985 142.512 122.391 145.668 109.918 145.668C99.6509 145.668 90.8726 142.632 84.0416 136.784C77.1106 130.845 72.7387 122.684 72.7387 113.516C72.7387 104.411 77.1346 96.292 84.0951 90.0328L71.0156 79.2978C60.8386 88.8992 55.2122 101.221 55.2122 113.516C55.2122 128.084 61.5445 140.733 72.2768 149.792C82.5641 158.497 95.6523 163.069 109.918 163.069C128.523 163.069 142.878 158.406 153.139 149.356C160.951 142.284 164.987 132.935 164.987 124.13C164.987 107.586 153.434 96.5972 141.537 88.9883ZM113.672 121.056C107.978 121.056 103.006 118.064 103.006 111.371C103.006 102.199 111.484 97.9634 118.351 97.9634C120.767 97.9634 123.049 98.2152 125.182 98.7003C124.82 106.093 122.452 121.056 113.672 121.056Z" fill="#000000"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium group-hover:text-gray-900">Threads</span>
            </div>

            {/* Pinterest */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#E60023"/>
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.852 0 1.264.64 1.264 1.408 0 .858-.545 2.14-.828 3.33-.236.995.5 1.807 1.48 1.807 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.745 2.281a.3.3 0 01.069.288l-.278 1.133c-.044.183-.145.223-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.525-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="white"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium group-hover:text-gray-900">Pinterest</span>
            </div>

            {/* Bluesky */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z" fill="#00A8E8"/>
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium group-hover:text-gray-900">Bluesky</span>
            </div>
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
            <span className="block sm:inline">Loved by content</span>
            <span className="block sm:inline sm:ml-1">creators worldwide</span>
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
                className="flex-shrink-0 w-[280px] sm:w-[380px] mx-2 sm:mx-3"
              >
                <Card className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 h-[100px] sm:h-[120px] border-gray-100">
                  <CardContent className="h-full flex items-center justify-center p-4 sm:p-5">
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-normal text-center">
                      {testimonial}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          {/* Fade gradients on both sides */}
          <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
        </div>
        
        {/* Second row - scrolling right to left */}
        <div className="relative z-10">
          <div className="flex animate-scroll-left">
            {/* Duplicate the testimonials for seamless loop */}
            {[...testimonials[1], ...testimonials[1]].map((testimonial, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[280px] sm:w-[380px] mx-2 sm:mx-3"
              >
                <Card className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 h-[100px] sm:h-[120px] border-gray-100">
                  <CardContent className="h-full flex items-center justify-center p-4 sm:p-5">
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-normal text-center">
                      {testimonial}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          {/* Fade gradients on both sides */}
          <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
        </div>
      </section>

      {/* Gradient CTA Section */}
      <GradientCTA />

      {/* Footer */}
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
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
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
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors font-medium">
                    Privacy Policy
                  </Link>
                </li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p className="mb-2">&copy; 2025 SocialCal. All rights reserved.</p>
            <div className="flex justify-center space-x-4 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors underline">Privacy Policy</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-white transition-colors underline">Terms of Service</Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-white transition-colors underline">Contact Us</Link>
            </div>
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
    </>
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
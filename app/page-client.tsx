'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BarChart } from 'lucide-react'
import { useEffect, useState, Suspense, lazy } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthModals } from '@/components/auth/auth-modals'
import { MobileMenu } from '@/components/layout/mobile-menu'
import Script from 'next/script'

// Lazy load heavy components
const HeroWithPlatforms = lazy(() => import('@/components/landing/hero-with-platforms').then(mod => ({ default: mod.HeroWithPlatforms })))
const FeaturesSection = lazy(() => import('@/components/landing/features-section').then(mod => ({ default: mod.FeaturesSection })))
const ImpactSection = lazy(() => import('@/components/landing/impact-section').then(mod => ({ default: mod.ImpactSection })))
const TestimonialsSection = lazy(() => import('@/components/landing/testimonials-section').then(mod => ({ default: mod.TestimonialsSection })))
const CapabilitiesCarousel = lazy(() => import('@/components/landing/capabilities-carousel').then(mod => ({ default: mod.CapabilitiesCarousel })))
const HowItWorksSection = lazy(() => import('@/components/landing/how-it-works-section'))
const GradientCTA = lazy(() => import('@/components/landing/gradient-cta'))

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

// Component loading skeleton
const ComponentSkeleton = () => (
  <div className="animate-pulse bg-gray-100 h-96 rounded-lg" />
)


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
      
      {/* Header - outside the main wrapper */}
      <header className="sticky top-0 left-0 w-full z-50 bg-white backdrop-blur-lg border-b border-gray-200 shadow-lg">
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

      {/* Main Content Wrapper */}
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section with Platforms - Shared Background */}
      <Suspense fallback={<ComponentSkeleton />}>
        <HeroWithPlatforms 
          isAuthenticated={isAuthenticated} 
          onSignInClick={() => setSignInOpen(true)}
        />
      </Suspense>

      {/* Capabilities Carousel Section - MOVED UP */}
      <Suspense fallback={<ComponentSkeleton />}>
        <CapabilitiesCarousel />
      </Suspense>

      {/* How It Works Section */}
      <Suspense fallback={<ComponentSkeleton />}>
        <HowItWorksSection />
      </Suspense>

      {/* Impact Section */}
      <Suspense fallback={<ComponentSkeleton />}>
        <ImpactSection />
      </Suspense>

      {/* Features Section */}
      <Suspense fallback={<ComponentSkeleton />}>
        <FeaturesSection />
      </Suspense>


      {/* Testimonials Section */}
      <Suspense fallback={<ComponentSkeleton />}>
        <TestimonialsSection />
      </Suspense>

      {/* Gradient CTA Section */}
      <Suspense fallback={<ComponentSkeleton />}>
        <GradientCTA />
      </Suspense>

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
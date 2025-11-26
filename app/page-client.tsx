'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BarChart } from 'lucide-react'
import { useEffect, useState, Suspense, lazy } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AuthModals } from '@/components/auth/auth-modals'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { Navbar } from '@/components/layout/navbar'
import OAuthRedirectHandler from '@/components/landing/oauth-redirect-handler'
import HomePageWrapper from '@/components/landing/home-page-wrapper'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { getClientSubscription } from '@/lib/subscription/client'

// Keep hero non-lazy for immediate display
import { HeroWithPlatforms } from '@/components/landing/hero-with-platforms'

// Lazy load heavy components for better performance
const FeaturesSection = lazy(() => import('@/components/landing/features-section').then(mod => ({ default: mod.FeaturesSection })))
const ImpactSection = lazy(() => import('@/components/landing/impact-section').then(mod => ({ default: mod.ImpactSection })))
const TestimonialsSection = lazy(() => import('@/components/landing/testimonials-section').then(mod => ({ default: mod.TestimonialsSection })))
const CapabilitiesCarousel = lazy(() => import('@/components/landing/capabilities-carousel').then(mod => ({ default: mod.CapabilitiesCarousel })))
const HowItWorksSection = lazy(() => import('@/components/landing/how-it-works-section'))
const GradientCTA = lazy(() => import('@/components/landing/gradient-cta'))
const SupportedPlatforms = lazy(() => import('@/components/landing/supported-platforms').then(mod => ({ default: mod.SupportedPlatforms })))

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SocialCal",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "All-in-one social media management platform for scheduling posts across 9+ platforms with AI-powered captions and analytics",
  "url": "https://www.socialcal.app",
  "image": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard-v7.webp",
  "screenshot": "https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard-v7.webp",
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


interface LandingPageContentProps {
  isAuthenticated: boolean
  userEmail: string | null
}

function LandingPageContent({ isAuthenticated, userEmail }: LandingPageContentProps) {
  const [signInOpen, setSignInOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // Client-side auth state (will be updated after mount)
  const [clientAuth, setClientAuth] = useState<{
    isAuthenticated: boolean
    userEmail: string | null
    hasSubscription: boolean
    isChecking: boolean
  }>({
    isAuthenticated,
    userEmail,
    hasSubscription: false,
    isChecking: true // Initially checking
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check client-side auth state and subscription on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // If user is authenticated, also check subscription status
        let hasSubscription = false
        if (user) {
          const subscription = await getClientSubscription()
          hasSubscription = subscription?.hasSubscription ?? false
        }

        setClientAuth({
          isAuthenticated: !!user,
          userEmail: user?.email || null,
          hasSubscription,
          isChecking: false
        })
      } catch (error) {
        console.error('Error checking auth:', error)
        setClientAuth({
          isAuthenticated: false,
          userEmail: null,
          hasSubscription: false,
          isChecking: false
        })
      }
    }

    checkAuth()
  }, [])

  // Track affiliate clicks
  useEffect(() => {
    const trackAffiliateClick = async () => {
      try {
        // Check if we've already tracked this session
        const hasTracked = sessionStorage.getItem('affiliate_click_tracked')
        if (hasTracked) {
          return
        }

        // Get referral code from cookie
        const cookies = document.cookie.split(';')
        let referralCode: string | null = null

        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === 'socialcal_referral') {
            referralCode = value
            break
          }
        }

        // If no referral code, nothing to track
        if (!referralCode) {
          return
        }

        // Call API to record click
        const response = await fetch('/api/affiliate/track-click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ referralCode }),
        })

        if (response.ok) {
          // Mark as tracked for this session
          sessionStorage.setItem('affiliate_click_tracked', 'true')
          console.log('Affiliate click tracked successfully')
        }
      } catch (error) {
        // Silently fail - don't break page load
        console.error('Error tracking affiliate click:', error)
      }
    }

    trackAffiliateClick()
  }, [])

  useEffect(() => {
    // Check URL parameters for modal triggers and scrolling
    const shouldOpenSignIn = searchParams.get('signin') === 'true'
    const errorMessage = searchParams.get('error')
    const scrollTo = searchParams.get('scroll')

    if (shouldOpenSignIn) {
      setSignInOpen(true)
      // Show error toast if present
      if (errorMessage) {
        toast.error(errorMessage)
      }
      router.replace('/', { scroll: false })
    }

    // Handle scroll parameter (like pricing page does for FAQ)
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
      }, 500) // Delay to ensure lazy-loaded components are rendered
    }
  }, [searchParams, router])




  return (
    <>
      <OAuthRedirectHandler />
      <HomePageWrapper>
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

      {/* Shared Navbar Component */}
      <Navbar
        isAuthenticated={clientAuth.isChecking ? null : clientAuth.isAuthenticated}
        userEmail={clientAuth.userEmail}
        hasSubscription={clientAuth.hasSubscription}
        onSignInClick={() => setSignInOpen(true)}
        onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={clientAuth.isAuthenticated}
        userEmail={clientAuth.userEmail}
        hasSubscription={clientAuth.hasSubscription}
        onSignInClick={() => setSignInOpen(true)}
      />

      {/* Main Content Wrapper - No margin needed as header is sticky */}
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 overflow-x-hidden">
      {/* Hero Section with Platforms - Not lazy loaded for immediate display */}
      <HeroWithPlatforms
        isAuthenticated={clientAuth.isAuthenticated}
        onSignInClick={() => setSignInOpen(true)}
      />

      {/* Capabilities Carousel Section */}
      <Suspense fallback={<div className="h-96 animate-pulse bg-gray-50" />}>
        <CapabilitiesCarousel />
      </Suspense>

      {/* Impact Section */}
      <Suspense fallback={<div className="h-96 animate-pulse bg-gray-50" />}>
        <ImpactSection />
      </Suspense>

      {/* How It Works Section */}
      <Suspense fallback={<div className="h-96 animate-pulse bg-white" />}>
        <HowItWorksSection />
      </Suspense>

      {/* Features Section */}
      <Suspense fallback={<div className="h-96 animate-pulse bg-white" />}>
        <FeaturesSection />
      </Suspense>

      {/* Supported Platforms Section */}
      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-50" />}>
        <SupportedPlatforms />
      </Suspense>

      {/* Testimonials Section */}
      <Suspense fallback={<div className="h-96 animate-pulse bg-white" />}>
        <TestimonialsSection />
      </Suspense>

      {/* Gradient CTA Section */}
      <Suspense fallback={<div className="h-64 animate-pulse bg-gradient-to-br from-blue-50 to-indigo-50" />}>
        <GradientCTA />
      </Suspense>

      {/* Footer */}
      <footer className="bg-black text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
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
                <li><Link href="/pricing" scroll={false} className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" scroll={false} className="hover:text-white">About</Link></li>
                <li><Link href="/blog" scroll={false} className="hover:text-white">Blog</Link></li>
                <li><Link href="/contact" scroll={false} className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Partners</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/affiliate" scroll={false} className="hover:text-white">Affiliate Program</Link></li>
                <li><Link href="/affiliate/terms" scroll={false} className="hover:text-white">Affiliate Terms</Link></li>
              </ul>
            </div>
            <div className="md:col-span-1">
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/terms" scroll={false} className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li>
                  <Link href="/privacy" scroll={false} className="hover:text-white transition-colors font-medium">
                    Privacy Policy
                  </Link>
                </li>
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
      </HomePageWrapper>
    </>
  )
}

interface LandingPageProps {
  isAuthenticated: boolean
  userEmail: string | null
}

export default function LandingPage({ isAuthenticated, userEmail }: LandingPageProps) {
  return (
    <Suspense fallback={null}>
      <LandingPageContent isAuthenticated={isAuthenticated} userEmail={userEmail} />
    </Suspense>
  )
}
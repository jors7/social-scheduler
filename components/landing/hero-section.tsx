'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { getBlurData } from '@/lib/image-blur'

interface HeroSectionProps {
  isAuthenticated: boolean | null
  onSignInClick: () => void
}

export function HeroSection({ isAuthenticated, onSignInClick }: HeroSectionProps) {
  const router = useRouter()
  const heroBlurData = getBlurData('hero-dashboard')

  return (
    <section className="relative pt-10 lg:pt-0 pb-10 px-4 overflow-hidden">
      <div className="max-w-[1500px] mx-auto px-6 relative">
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
              <p className="mt-4 text-xs text-gray-500">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="text-gray-500 hover:text-gray-600 underline">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-gray-500 hover:text-gray-600 underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="w-full max-w-full overflow-hidden md:max-w-[900px] md:overflow-visible lg:-ml-20 lg:mt-4">
            <Image
              src="https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp"
              alt="SocialCal Dashboard"
              width={1800}
              height={1200}
              priority
              placeholder={heroBlurData ? "blur" : "empty"}
              blurDataURL={heroBlurData?.base64}
              className="w-full h-auto scale-100 md:scale-[1.24] origin-left"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

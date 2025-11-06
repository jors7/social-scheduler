import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LandingPageClient from './page-client'

// Revalidate every hour for fresh content
export const revalidate = 3600

// Generate static page at build time
export const dynamic = 'force-static'

// Hardcoded metadata for better performance (no database query)
export const metadata: Metadata = {
  metadataBase: new URL('https://www.socialcal.app'),
  title: {
    default: 'SocialCal - Schedule Posts Across All Social Media Platforms',
    template: '%s | SocialCal'
  },
  description: 'Save 15+ hours weekly with SocialCal. Schedule and manage social media posts across Twitter/X, Instagram, Facebook, LinkedIn, YouTube, TikTok, Threads, Bluesky, and Pinterest from one powerful dashboard.',
  keywords: [
    'social media scheduler',
    'social media management',
    'content scheduling',
    'social media automation',
    'Instagram scheduler',
    'Facebook scheduler',
    'Twitter scheduler',
    'LinkedIn scheduler',
    'TikTok scheduler',
    'YouTube scheduler',
    'Threads scheduler',
    'Bluesky scheduler',
    'Pinterest scheduler',
    'AI social media',
    'social media analytics',
    'content calendar',
    'social media tool',
    'multi-platform posting',
    'social media dashboard'
  ],
  authors: [{ name: 'SocialCal Team' }],
  creator: 'SocialCal',
  publisher: 'SocialCal',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.socialcal.app',
    siteName: 'SocialCal',
    title: 'SocialCal - Schedule Posts Across All Social Media Platforms',
    description: 'Save 15+ hours weekly. Schedule and manage social media posts across 9+ platforms from one dashboard.',
    images: [
      {
        url: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp',
        width: 1200,
        height: 630,
        alt: 'SocialCal Dashboard',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SocialCal - All-in-One Social Media Scheduler',
    description: 'Save 15+ hours weekly. Schedule posts across 9+ social platforms.',
    images: ['https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp'],
    creator: '@socialcal',
    site: '@socialcal',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default async function HomePage() {
  // Server-side auth check (no blocking client-side calls)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <LandingPageClient
      isAuthenticated={!!user}
      userEmail={user?.email || null}
    />
  )
}
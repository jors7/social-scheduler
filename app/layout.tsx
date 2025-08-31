import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

// Static metadata for root layout (dynamic metadata will be in page.tsx files)
export const metadata: Metadata = {
  metadataBase: new URL('https://www.socialcal.app'),
  title: {
    default: 'SocialCal - Schedule Posts Across All Social Media Platforms',
    template: '%s | SocialCal'
  },
  description: 'Save 15+ hours weekly with SocialCal. Schedule and manage social media posts across Twitter/X, Instagram, Facebook, LinkedIn, YouTube, TikTok, Threads, Bluesky, and Pinterest from one powerful dashboard. AI-powered captions, analytics, and team collaboration.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
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
  icons: {
    icon: [
      { url: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp', sizes: 'any' },
      { url: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp', sizes: '16x16', type: 'image/webp' },
      { url: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp', sizes: '32x32', type: 'image/webp' }
    ],
    apple: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp',
    },
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.socialcal.app',
    siteName: 'SocialCal',
    title: 'SocialCal - Schedule Posts Across All Social Media Platforms',
    description: 'Save 15+ hours weekly. Schedule and manage social media posts across 9+ platforms from one dashboard. AI-powered captions, analytics, and team collaboration.',
    images: [
      {
        url: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp',
        width: 1200,
        height: 630,
        alt: 'SocialCal Dashboard - Social Media Management Platform',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SocialCal - All-in-One Social Media Scheduler',
    description: 'Save 15+ hours weekly. Schedule posts across 9+ social platforms with AI-powered captions and analytics.',
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
  alternates: {
    canonical: 'https://www.socialcal.app',
  },
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
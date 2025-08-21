import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

interface SEOSettings {
  title?: string
  description?: string
  keywords?: string[]
  og_title?: string
  og_description?: string
  og_image?: string
  og_type?: string
  twitter_card?: string
  twitter_title?: string
  twitter_description?: string
  twitter_image?: string
  canonical_url?: string
  robots?: string
  author?: string
  structured_data?: any
  custom_meta?: any
}

const defaultMetadata: Metadata = {
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

export async function generatePageMetadata(pagePath: string): Promise<Metadata> {
  try {
    const supabase = await createClient()
    
    const { data: seoSettings } = await supabase
      .from('seo_settings')
      .select('*')
      .eq('page_path', pagePath)
      .single()

    if (!seoSettings) {
      return getDefaultMetadataForPath(pagePath)
    }

    const metadata: Metadata = {
      ...defaultMetadata,
      title: seoSettings.title || defaultMetadata.title,
      description: seoSettings.description || defaultMetadata.description,
      keywords: seoSettings.keywords || defaultMetadata.keywords,
      authors: seoSettings.author ? [{ name: seoSettings.author }] : defaultMetadata.authors,
      openGraph: {
        ...defaultMetadata.openGraph,
        title: seoSettings.og_title || seoSettings.title || defaultMetadata.openGraph?.title,
        description: seoSettings.og_description || seoSettings.description || defaultMetadata.openGraph?.description,
        images: seoSettings.og_image ? [{ url: seoSettings.og_image }] : defaultMetadata.openGraph?.images,
      } as any,
      twitter: {
        ...defaultMetadata.twitter,
        card: (seoSettings.twitter_card as any) || defaultMetadata.twitter?.card,
        title: seoSettings.twitter_title || seoSettings.title || defaultMetadata.twitter?.title,
        description: seoSettings.twitter_description || seoSettings.description || defaultMetadata.twitter?.description,
        images: seoSettings.twitter_image ? [seoSettings.twitter_image] : defaultMetadata.twitter?.images,
      },
      alternates: {
        canonical: seoSettings.canonical_url || `https://www.socialcal.app${pagePath}`,
      },
    }

    if (seoSettings.robots) {
      const robotsValue = seoSettings.robots.toLowerCase()
      metadata.robots = {
        index: robotsValue.includes('index'),
        follow: robotsValue.includes('follow'),
        nocache: false,
        googleBot: {
          index: robotsValue.includes('index'),
          follow: robotsValue.includes('follow'),
          noimageindex: false,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      }
    }

    return metadata
  } catch (error) {
    console.error('Error fetching SEO settings:', error)
    return getDefaultMetadataForPath(pagePath)
  }
}

function getDefaultMetadataForPath(pagePath: string): Metadata {
  const pathDefaults: Record<string, Partial<Metadata>> = {
    '/': {
      ...defaultMetadata,
    },
    '/pricing': {
      ...defaultMetadata,
      title: 'Pricing - Affordable Social Media Management Plans',
      description: 'Choose the perfect SocialCal plan for your needs. Starting at $9/month with 7-day free trial. Schedule posts across 9+ social media platforms.',
      openGraph: {
        ...defaultMetadata.openGraph,
        title: 'SocialCal Pricing - Social Media Management Plans',
        description: 'Affordable social media scheduling starting at $9/month. 7-day free trial.',
      },
      twitter: {
        ...defaultMetadata.twitter,
        title: 'SocialCal Pricing - Starting at $9/month',
        description: 'Affordable social media scheduling. 7-day free trial.',
      },
    },
    '/about': {
      ...defaultMetadata,
      title: 'About SocialCal - Your Social Media Management Partner',
      description: 'Learn about SocialCal, the all-in-one social media management platform helping businesses save 15+ hours weekly on content scheduling.',
      openGraph: {
        ...defaultMetadata.openGraph,
        title: 'About SocialCal - Social Media Management Platform',
        description: 'The all-in-one platform helping businesses save 15+ hours weekly.',
      },
    },
    '/blog': {
      ...defaultMetadata,
      title: 'Blog - Social Media Marketing Tips & Strategies',
      description: 'Expert insights on social media marketing, content strategy, and platform best practices. Learn how to grow your social presence.',
      openGraph: {
        ...defaultMetadata.openGraph,
        title: 'SocialCal Blog - Social Media Marketing Insights',
        description: 'Expert tips and strategies for social media success.',
      },
    },
    '/support': {
      ...defaultMetadata,
      title: 'Support - Get Help with SocialCal',
      description: 'Need help with SocialCal? Find answers to common questions, contact our support team, or browse our documentation.',
      openGraph: {
        ...defaultMetadata.openGraph,
        title: 'SocialCal Support - We\'re Here to Help',
        description: 'Get help with SocialCal. FAQs, documentation, and support.',
      },
    },
    '/terms': {
      ...defaultMetadata,
      title: 'Terms of Service - SocialCal',
      description: 'Read the SocialCal terms of service. Understand your rights and responsibilities when using our social media management platform.',
      openGraph: {
        ...defaultMetadata.openGraph,
        title: 'Terms of Service - SocialCal',
        description: 'SocialCal terms of service and user agreement.',
      },
    },
    '/privacy': {
      ...defaultMetadata,
      title: 'Privacy Policy - SocialCal',
      description: 'Learn how SocialCal protects your privacy and handles your data. Our commitment to keeping your information secure.',
      openGraph: {
        ...defaultMetadata.openGraph,
        title: 'Privacy Policy - SocialCal',
        description: 'How SocialCal protects your privacy and handles your data.',
      },
    },
  }

  return pathDefaults[pagePath] || defaultMetadata
}
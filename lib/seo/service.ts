import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'

export interface SEOSettings {
  page_path: string
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

// Default SEO settings fallback
const defaultSEO: Partial<SEOSettings> = {
  title: 'SocialCal - Schedule Posts Across All Social Media Platforms',
  description: 'Save 15+ hours weekly with SocialCal. Schedule and manage social media posts across Twitter/X, Instagram, Facebook, LinkedIn, YouTube, TikTok, Threads, Bluesky, and Pinterest from one powerful dashboard.',
  keywords: [
    'social media scheduler',
    'social media management',
    'content scheduling',
    'social media automation',
  ],
  og_title: 'SocialCal - Schedule Posts Across All Social Media Platforms',
  og_description: 'Save 15+ hours weekly. Schedule and manage social media posts across 9+ platforms from one dashboard.',
  og_image: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard-v7.webp',
  og_type: 'website',
  twitter_card: 'summary_large_image',
  twitter_title: 'SocialCal - All-in-One Social Media Scheduler',
  twitter_description: 'Save 15+ hours weekly. Schedule posts across 9+ social platforms with AI-powered captions.',
  twitter_image: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard-v7.webp',
  robots: 'index, follow',
  author: 'SocialCal',
}

export async function getSEOSettings(pagePath: string): Promise<SEOSettings> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('seo_settings')
      .select('*')
      .eq('page_path', pagePath)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching SEO settings:', error)
    }

    // Merge with defaults
    return {
      page_path: pagePath,
      ...defaultSEO,
      ...data,
    } as SEOSettings
  } catch (error) {
    console.error('Error in getSEOSettings:', error)
    return {
      page_path: pagePath,
      ...defaultSEO,
    } as SEOSettings
  }
}

export function generateMetadata(seo: SEOSettings): Metadata {
  const baseUrl = 'https://www.socialcal.app'
  
  const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title: seo.title || defaultSEO.title,
    description: seo.description || defaultSEO.description,
    keywords: seo.keywords || defaultSEO.keywords,
    authors: [{ name: seo.author || defaultSEO.author }],
    creator: seo.author || defaultSEO.author,
    publisher: 'SocialCal',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: (seo.og_type || defaultSEO.og_type) as any,
      locale: 'en_US',
      url: seo.canonical_url || `${baseUrl}${seo.page_path}`,
      siteName: 'SocialCal',
      title: seo.og_title || seo.title || defaultSEO.og_title,
      description: seo.og_description || seo.description || defaultSEO.og_description,
      images: seo.og_image ? [
        {
          url: seo.og_image,
          width: 1200,
          height: 630,
          alt: seo.og_title || seo.title || 'SocialCal',
        }
      ] : undefined,
    },
    twitter: {
      card: (seo.twitter_card || defaultSEO.twitter_card) as any,
      title: seo.twitter_title || seo.og_title || seo.title,
      description: seo.twitter_description || seo.og_description || seo.description,
      images: seo.twitter_image ? [seo.twitter_image] : seo.og_image ? [seo.og_image] : undefined,
      creator: '@socialcal',
      site: '@socialcal',
    },
    robots: seo.robots ? {
      index: seo.robots.includes('index'),
      follow: seo.robots.includes('follow'),
      nocache: false,
      googleBot: {
        index: seo.robots.includes('index'),
        follow: seo.robots.includes('follow'),
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large' as any,
        'max-snippet': -1,
      },
    } : undefined,
    alternates: {
      canonical: seo.canonical_url || `${baseUrl}${seo.page_path}`,
    },
  }

  // Add custom meta tags if provided
  if (seo.custom_meta) {
    (metadata as any).other = seo.custom_meta
  }

  return metadata
}
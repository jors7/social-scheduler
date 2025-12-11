import Head from 'next/head'

interface SEOMetaProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: string
  keywords?: string[]
  author?: string
  publishedTime?: string
  modifiedTime?: string
}

export function SEOMeta({
  title = 'SocialCal - Schedule Posts Across All Social Media Platforms',
  description = 'Save 15+ hours weekly with SocialCal. Schedule and manage social media posts across 9+ platforms with AI-powered captions and analytics.',
  image = 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/og-header.png',
  url = 'https://www.socialcal.app',
  type = 'website',
  keywords = [],
  author = 'SocialCal',
  publishedTime,
  modifiedTime,
}: SEOMetaProps) {
  const fullTitle = title.includes('SocialCal') ? title : `${title} | SocialCal`
  
  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      <meta name="author" content={author} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="SocialCal" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@socialcal" />
      <meta name="twitter:creator" content="@socialcal" />
      
      {/* Article specific */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
    </Head>
  )
}
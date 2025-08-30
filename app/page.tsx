import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import LandingPageClient from './page-client'

// Revalidate every hour for fresh content
export const revalidate = 3600

// Generate static page at build time
export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/')
}

export default function HomePage() {
  return <LandingPageClient />
}
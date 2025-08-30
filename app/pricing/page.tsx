import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import PricingPageClient from './page-client'

// Revalidate every hour for pricing updates
export const revalidate = 3600

// Generate static page at build time
export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/pricing')
}

export default function PricingPage() {
  return <PricingPageClient />
}
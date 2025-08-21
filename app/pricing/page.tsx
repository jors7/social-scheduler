import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import PricingPageClient from './page-client'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/pricing')
}

export default function PricingPage() {
  return <PricingPageClient />
}
import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import TermsOfServiceClient from './page-client'

// Force static generation - terms rarely change
export const dynamic = 'force-static'

// Revalidate once per day (86400 seconds)
export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/terms')
}

export default function TermsOfService() {
  return <TermsOfServiceClient />
}
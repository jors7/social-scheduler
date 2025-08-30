import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import PrivacyPolicyClient from './page-client'

// Force static generation - privacy policy rarely changes
export const dynamic = 'force-static'

// Revalidate once per day (86400 seconds)
export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/privacy')
}

export default function PrivacyPolicy() {
  return <PrivacyPolicyClient />
}
import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import AboutPageClient from './page-client'

// Static generation with daily revalidation
export const dynamic = 'force-static'
export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/about')
}

export default function AboutPage() {
  return <AboutPageClient />
}
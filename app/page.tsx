import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import LandingPageClient from './page-client'

// Temporarily disable static generation to debug mobile scroll issue
// export const revalidate = 3600
// export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/')
}

export default function HomePage() {
  return <LandingPageClient />
}
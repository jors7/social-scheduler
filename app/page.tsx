import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import LandingPageClient from './page-client'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/')
}

export default function HomePage() {
  return <LandingPageClient />
}
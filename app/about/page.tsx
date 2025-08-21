import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import AboutPageClient from './page-client'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/about')
}

export default function AboutPage() {
  return <AboutPageClient />
}
import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import ContactPageClient from './page-client'

// Static generation with daily revalidation
export const dynamic = 'force-static'
export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/contact')
}

export default function ContactPage() {
  return <ContactPageClient />
}
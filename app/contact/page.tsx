import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import ContactPageClient from './page-client'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/contact')
}

export default function ContactPage() {
  return <ContactPageClient />
}
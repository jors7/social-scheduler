import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import SupportPageClient from './page-client'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/support')
}

export default function SupportPage() {
  return <SupportPageClient />
}
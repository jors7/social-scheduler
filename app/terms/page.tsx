import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import TermsOfServiceClient from './page-client'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/terms')
}

export default function TermsOfService() {
  return <TermsOfServiceClient />
}
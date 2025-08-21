import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo/metadata'
import PrivacyPolicyClient from './page-client'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('/privacy')
}

export default function PrivacyPolicy() {
  return <PrivacyPolicyClient />
}
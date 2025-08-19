import { Metadata } from 'next'
import { getSEOSettings, generateMetadata as generateSEOMetadata } from '@/lib/seo/service'

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOSettings('/pricing')
  return generateSEOMetadata(seo)
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
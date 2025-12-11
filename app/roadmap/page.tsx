import { Suspense } from 'react'
import { Metadata } from 'next'
import RoadmapPageClient from './page-client'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Feature Roadmap | SocialCal',
  description: 'See what we\'re building next. Vote on features and track our progress on the SocialCal product roadmap.',
  openGraph: {
    title: 'Feature Roadmap | SocialCal',
    description: 'See what we\'re building next. Vote on features and track our progress.',
    url: 'https://www.socialcal.app/roadmap',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Feature Roadmap | SocialCal',
    description: 'See what we\'re building next. Vote on features and track our progress.',
  },
  alternates: {
    canonical: 'https://www.socialcal.app/roadmap',
  },
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <RoadmapPageClient />
    </Suspense>
  )
}

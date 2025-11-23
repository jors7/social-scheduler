import { Suspense } from 'react'
import RoadmapPageClient from './page-client'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Feature Roadmap | SocialCal',
  description: 'See what we\'re building next. Vote on features and track our progress.',
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

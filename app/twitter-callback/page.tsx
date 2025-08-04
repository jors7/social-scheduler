'use client'

import { Suspense } from 'react'
import TwitterCallbackContent from './twitter-callback-content'

export default function TwitterCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TwitterCallbackContent />
    </Suspense>
  )
}
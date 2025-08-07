'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SignupRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')

  useEffect(() => {
    // Redirect to homepage and open signup modal
    const url = plan ? `/?signup=true&plan=${plan}` : '/?signup=true'
    router.push(url)
  }, [router, plan])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to homepage...</p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <SignupRedirect />
    </Suspense>
  )
}
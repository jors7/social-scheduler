'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to homepage and open login modal
    router.push('/?signin=true')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to homepage...</p>
      </div>
    </div>
  )
}
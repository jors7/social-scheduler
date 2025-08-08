'use client'

import { Suspense } from 'react'
import { SubscriptionGate } from './subscription-gate'
import { Loader2 } from 'lucide-react'

interface SubscriptionGateWrapperProps {
  children: React.ReactNode
  feature?: string
  className?: string
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}

export function SubscriptionGateWrapper(props: SubscriptionGateWrapperProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SubscriptionGate {...props} />
    </Suspense>
  )
}
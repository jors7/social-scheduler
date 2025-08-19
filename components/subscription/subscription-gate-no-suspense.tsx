'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSubscriptionContext } from '@/providers/subscription-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles, TrendingUp, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SubscriptionGateNoSuspenseProps {
  children: React.ReactNode
  feature?: string
  className?: string
}

export function SubscriptionGateNoSuspense({ children, feature = 'premium features', className }: SubscriptionGateNoSuspenseProps) {
  const { subscription, loading, refresh } = useSubscriptionContext()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Check if we just returned from a successful payment
    const subscriptionParam = searchParams.get('subscription')
    if (subscriptionParam === 'success') {
      handlePaymentSuccess()
    }
  }, [searchParams])

  const handlePaymentSuccess = async () => {
    toast.success('Payment successful! Your subscription is now active.')
    
    // Wait a moment for webhook to process then refresh
    setTimeout(async () => {
      await refresh()
    }, 2000)
  }

  const handleSubscribe = () => {
    // Redirect to pricing page
    router.push('/pricing')
  }

  // Always render children during SSR and initial client render to avoid hydration mismatch
  if (!mounted) {
    return <div className={className}>{children}</div>
  }

  // After mounting, check subscription status
  if (loading && !subscription) {
    return (
      <div className={cn("relative min-h-[400px]", className)}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500">Loading subscription...</p>
          </div>
        </div>
      </div>
    )
  }

  // Check if user has active subscription
  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing'

  if (!hasActiveSubscription) {
    return (
      <div className={cn("relative", className)}>
        <Card className="max-w-2xl mx-auto my-8 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full">
                <Lock className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Upgrade to Premium</CardTitle>
            <CardDescription className="text-base mt-2">
              Unlock {feature} and take your social media game to the next level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">AI-Powered Content</p>
                  <p className="text-sm text-gray-600">Get intelligent suggestions tailored to each platform</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Advanced Analytics</p>
                  <p className="text-sm text-gray-600">Track performance and optimize your posting strategy</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Team Collaboration</p>
                  <p className="text-sm text-gray-600">Work together with your team seamlessly</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={handleSubscribe}
              >
                Subscribe Now
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/pricing')}
              >
                View Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User has active subscription, render children
  return <div className={className}>{children}</div>
}
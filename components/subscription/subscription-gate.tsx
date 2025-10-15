'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSubscriptionContext } from '@/providers/subscription-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles, TrendingUp, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SubscriptionGateProps {
  children: React.ReactNode
  feature?: string
  className?: string
}

export function SubscriptionGate({ children, feature = 'premium features', className }: SubscriptionGateProps) {
  const { subscription, loading, refresh } = useSubscriptionContext()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if we just returned from a successful payment
    const subscriptionParam = searchParams.get('subscription')
    if (subscriptionParam === 'success') {
      handlePaymentSuccess()
    }
  }, [searchParams])

  const handlePaymentSuccess = async () => {
    toast.success('Payment successful! Activating your subscription...')

    // Wait for webhook to process then refresh
    // Webhooks typically process within 1-2 seconds
    setTimeout(async () => {
      await refresh()
      toast.success('Your subscription is now active!')
    }, 3000)
  }

  const handleSubscribe = () => {
    // Redirect to pricing page
    router.push('/pricing')
  }

  // Show proper loading skeleton
  if (loading) {
    return (
      <div className={cn("relative min-h-[400px]", className)}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
            <div className="space-y-2">
              <p className="text-base font-medium text-gray-900">Checking subscription status...</p>
              <p className="text-sm text-muted-foreground">This will only take a moment</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!subscription?.hasSubscription) {
    return (
      <div className={cn("relative", className)}>
        {/* Blurred content behind */}
        <div className="pointer-events-none select-none blur-sm">
          {children}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-background/30 backdrop-blur-sm z-10">
          <div className="absolute top-24 left-64 max-w-md">
            <Card className="shadow-2xl border-2">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Unlock {feature}</CardTitle>
                <CardDescription className="mt-2">
                  Upgrade to a paid plan to access scheduling and advanced features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Unlimited Scheduling</p>
                      <p className="text-sm text-muted-foreground">Schedule posts across all platforms</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Advanced Analytics</p>
                      <p className="text-sm text-muted-foreground">Track performance and engagement</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Team Collaboration</p>
                      <p className="text-sm text-muted-foreground">Work together with your team</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button 
                    onClick={handleSubscribe} 
                    className="w-full" 
                    size="lg"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Subscribe Now - Start 7-Day Trial
                  </Button>
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    No credit card required for trial
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // User has subscription, show content normally
  return <>{children}</>
}

export function useSubscription() {
  const { subscription, loading, refresh } = useSubscriptionContext()
  return { subscription, loading, refetch: refresh }
}
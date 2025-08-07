'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getClientSubscription, refreshSubscriptionStatus } from '@/lib/subscription/client'
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
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    checkSubscription()
    
    // Check if we just returned from a successful payment
    const subscriptionParam = searchParams.get('subscription')
    if (subscriptionParam === 'success') {
      handlePaymentSuccess()
    }
  }, [searchParams])

  const checkSubscription = async () => {
    try {
      const subscription = await getClientSubscription()
      
      if (!subscription) {
        setHasSubscription(false)
      } else {
        setHasSubscription(subscription.hasSubscription)
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
      setHasSubscription(false)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async () => {
    toast.success('Payment successful! Your subscription is now active.')
    
    // Wait a moment for webhook to process
    setTimeout(async () => {
      await refreshSubscriptionStatus()
      await checkSubscription()
    }, 2000)
  }

  const handleSubscribe = () => {
    // Redirect to homepage pricing section
    router.push('/#pricing')
  }

  if (loading) {
    return (
      <div className={cn("relative", className)}>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="animate-pulse">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      </div>
    )
  }

  if (!hasSubscription) {
    return (
      <div className={cn("relative", className)}>
        {/* Overlay */}
        <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-10 flex items-center justify-center p-8">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
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
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Unlimited Scheduling</p>
                    <p className="text-sm text-muted-foreground">Schedule posts across all platforms</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Advanced Analytics</p>
                    <p className="text-sm text-muted-foreground">Track performance and engagement</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Team Collaboration</p>
                    <p className="text-sm text-muted-foreground">Work together with your team</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
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
        
        {/* Blurred content behind */}
        <div className="opacity-20 pointer-events-none select-none">
          {children}
        </div>
      </div>
    )
  }

  // User has subscription, show content normally
  return <>{children}</>
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<{
    hasSubscription: boolean
    planId: string | null
    status: string | null
    isTrialing: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    try {
      const sub = await getClientSubscription()
      
      if (!sub) {
        setSubscription({ 
          hasSubscription: false, 
          planId: null, 
          status: null,
          isTrialing: false 
        })
      } else {
        setSubscription({
          hasSubscription: sub.hasSubscription,
          planId: sub.planId,
          status: sub.status,
          isTrialing: sub.isTrialing
        })
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
      setSubscription({ 
        hasSubscription: false, 
        planId: null, 
        status: null,
        isTrialing: false 
      })
    } finally {
      setLoading(false)
    }
  }

  return { subscription, loading, refetch: checkSubscription }
}
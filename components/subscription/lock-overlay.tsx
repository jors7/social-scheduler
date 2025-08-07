'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles, TrendingUp, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PlanId, SUBSCRIPTION_PLANS, formatPriceCompact } from '@/lib/subscription/plans'

interface LockOverlayProps {
  feature: string
  requiredPlan?: PlanId
  currentPlan?: PlanId
  className?: string
  children?: React.ReactNode
}

export function LockOverlay({ 
  feature, 
  requiredPlan = 'starter',
  currentPlan = 'free',
  className,
  children 
}: LockOverlayProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has access
    const planHierarchy: PlanId[] = ['free', 'starter', 'professional', 'enterprise']
    const currentPlanIndex = planHierarchy.indexOf(currentPlan)
    const requiredPlanIndex = planHierarchy.indexOf(requiredPlan)
    
    setIsVisible(currentPlanIndex < requiredPlanIndex)
  }, [currentPlan, requiredPlan])

  if (!isVisible) {
    return <>{children}</>
  }

  const upgradePlan = SUBSCRIPTION_PLANS[requiredPlan]
  
  const getFeatureIcon = () => {
    switch (feature.toLowerCase()) {
      case 'analytics':
        return <TrendingUp className="h-8 w-8 text-primary" />
      case 'ai suggestions':
        return <Sparkles className="h-8 w-8 text-primary" />
      case 'team':
        return <Users className="h-8 w-8 text-primary" />
      default:
        return <Lock className="h-8 w-8 text-primary" />
    }
  }

  const getFeatureDescription = () => {
    switch (feature.toLowerCase()) {
      case 'analytics':
        return 'Get detailed insights into your post performance across all platforms'
      case 'ai suggestions':
        return 'Let AI help you craft engaging captions that resonate with your audience'
      case 'bulk upload':
        return 'Save time by uploading and scheduling multiple posts at once'
      case 'unlimited posts':
        return 'Post as much as you want without any monthly limits'
      default:
        return `Unlock ${feature} and take your social media management to the next level`
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Blur and disable the content behind */}
      <div className="pointer-events-none opacity-50 blur-sm">
        {children}
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
        <Card className="max-w-md mx-auto animate-in fade-in-0 zoom-in-95 duration-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              {getFeatureIcon()}
            </div>
            <CardTitle className="text-2xl">{feature} is a Premium Feature</CardTitle>
            <CardDescription className="text-base mt-2">
              {getFeatureDescription()}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{upgradePlan.name} Plan</span>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatPriceCompact(upgradePlan.price_monthly)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  {upgradePlan.price_yearly > 0 && (
                    <div className="text-sm text-muted-foreground">
                      or {formatPriceCompact(upgradePlan.price_yearly / 12)}/mo yearly
                    </div>
                  )}
                </div>
              </div>
              
              <ul className="space-y-2 text-sm">
                {upgradePlan.features.posts_per_month === 'unlimited' && (
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    Unlimited posts per month
                  </li>
                )}
                {upgradePlan.features.ai_suggestions && (
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    AI-powered caption suggestions
                  </li>
                )}
                {upgradePlan.features.analytics !== false && (
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    {upgradePlan.features.analytics === 'advanced' ? 'Advanced' : 'Basic'} analytics
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  {upgradePlan.limits.connected_accounts === -1 
                    ? 'Unlimited connected accounts' 
                    : `Up to ${upgradePlan.limits.connected_accounts} connected accounts`}
                </li>
              </ul>
            </div>

            {upgradePlan.features.trial_days > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                🎉 Start with a {upgradePlan.features.trial_days}-day free trial
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex gap-3">
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={() => router.back()}
            >
              Go Back
            </Button>
            <Button 
              className="flex-1"
              onClick={() => router.push(`/pricing?plan=${requiredPlan}&feature=${encodeURIComponent(feature)}`)}
            >
              Upgrade Now
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  Check, 
  Loader2, 
  Sparkles,
  Crown,
  Shield,
  Zap,
  TrendingUp,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUBSCRIPTION_PLANS, PlanId, BillingCycle, formatPriceCompact, calculateAnnualSavings } from '@/lib/subscription/plans'

interface ChangePlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlanId: PlanId
  currentBillingCycle: BillingCycle
  isTrialing: boolean
  onPlanChange: () => void
}

interface PlanOption {
  planId: PlanId
  billingCycle: BillingCycle
}

export function ChangePlanModal({
  open,
  onOpenChange,
  currentPlanId,
  currentBillingCycle,
  isTrialing,
  onPlanChange
}: ChangePlanModalProps) {
  // If user is on annual plan, they can only switch to other annual plans
  const isLockedToAnnual = currentBillingCycle === 'yearly' && !isTrialing
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>(
    isLockedToAnnual ? 'yearly' : (currentBillingCycle || 'monthly')
  )
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const plans = ['starter', 'professional', 'enterprise'] as PlanId[]
  
  const getPlanIcon = (planId: PlanId) => {
    switch(planId) {
      case 'starter':
        return <Zap className="h-5 w-5" />
      case 'professional':
        return <Crown className="h-5 w-5" />
      case 'enterprise':
        return <Shield className="h-5 w-5" />
      default:
        return <Sparkles className="h-5 w-5" />
    }
  }

  const handlePlanSelect = (planId: PlanId) => {
    if (planId === currentPlanId && selectedBillingCycle === currentBillingCycle) {
      toast.info('This is your current plan')
      return
    }
    setSelectedPlan(planId)
    setShowConfirmation(true)
  }

  const handleConfirmChange = async () => {
    if (!selectedPlan) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPlanId: selectedPlan,
          billingCycle: selectedBillingCycle
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change plan')
      }

      toast.success('Plan changed successfully!')
      onPlanChange()
      onOpenChange(false)
    } catch (error) {
      console.error('Error changing plan:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to change plan')
    } finally {
      setLoading(false)
      setShowConfirmation(false)
      setSelectedPlan(null)
    }
  }

  const calculateProratedAmount = (newPlanId: PlanId) => {
    const newPlan = SUBSCRIPTION_PLANS[newPlanId]
    const currentPlan = SUBSCRIPTION_PLANS[currentPlanId]
    
    const newPrice = selectedBillingCycle === 'yearly' 
      ? newPlan.price_yearly / 12 
      : newPlan.price_monthly
    
    const currentPrice = currentBillingCycle === 'yearly'
      ? currentPlan.price_yearly / 12
      : currentPlan.price_monthly
    
    const difference = newPrice - currentPrice
    
    return {
      upgrade: difference > 0,
      amount: Math.abs(difference),
      immediate: difference > 0 // Upgrades are charged immediately, downgrades at end of period
    }
  }

  if (showConfirmation && selectedPlan) {
    const proration = calculateProratedAmount(selectedPlan)
    const newPlan = SUBSCRIPTION_PLANS[selectedPlan]
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Plan Change</DialogTitle>
            <DialogDescription>
              Review your plan change details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Current Plan</span>
                <span className="font-medium">
                  {SUBSCRIPTION_PLANS[currentPlanId].name} ({currentBillingCycle})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">New Plan</span>
                <span className="font-medium">
                  {newPlan.name} ({selectedBillingCycle})
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">New Price</span>
                  <span className="font-medium">
                    {formatPriceCompact(
                      selectedBillingCycle === 'yearly' 
                        ? newPlan.price_yearly / 12 
                        : newPlan.price_monthly
                    )}/month
                  </span>
                </div>
                {selectedBillingCycle === 'yearly' && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Annual Billing</span>
                    <span className="font-medium">
                      {formatPriceCompact(newPlan.price_yearly)}/year
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                {proration.upgrade ? (
                  <>
                    <p className="font-medium">Immediate charge</p>
                    <p>You&apos;ll be charged the prorated difference immediately.</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Changes at period end</p>
                    <p>Your plan will change at the end of your current billing period. You&apos;ll continue with your current plan until then.</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowConfirmation(false)
                setSelectedPlan(null)
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmChange}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing Plan...
                </>
              ) : (
                'Confirm Change'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Your Plan</DialogTitle>
          <DialogDescription>
            Choose the plan that best fits your needs. You can change anytime.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Billing Cycle Toggle - Hidden if locked to annual */}
          {!isLockedToAnnual ? (
            <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Label htmlFor="billing-toggle" className="text-base">
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={selectedBillingCycle === 'yearly'}
                onCheckedChange={(checked) => setSelectedBillingCycle(checked ? 'yearly' : 'monthly')}
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="billing-toggle" className="text-base">
                  Annual
                </Label>
                <Badge variant="default" className="bg-green-600">
                  Save up to 20%
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Info className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-900">
                <span className="font-medium">Annual billing only:</span> You can switch between annual plans. To change to monthly billing, please contact support.
              </p>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((planId) => {
              const plan = SUBSCRIPTION_PLANS[planId]
              const isCurrentPlan = planId === currentPlanId && selectedBillingCycle === currentBillingCycle
              const price = selectedBillingCycle === 'yearly' 
                ? plan.price_yearly 
                : plan.price_monthly
              const monthlyPrice = selectedBillingCycle === 'yearly' 
                ? plan.price_yearly / 12 
                : plan.price_monthly
              const savings = selectedBillingCycle === 'yearly' 
                ? calculateAnnualSavings(plan) 
                : 0

              return (
                <Card 
                  key={planId}
                  className={cn(
                    "relative cursor-pointer transition-all hover:shadow-lg",
                    isCurrentPlan && "border-primary ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => handlePlanSelect(planId)}
                >
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Current Plan
                    </Badge>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                      {getPlanIcon(planId)}
                      {savings > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Save {formatPriceCompact(savings)}
                        </Badge>
                      )}
                    </div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold">
                          {formatPriceCompact(monthlyPrice)}
                        </span>
                        <span className="text-gray-500 ml-1">/month</span>
                      </div>
                      {selectedBillingCycle === 'yearly' && (
                        <p className="text-sm text-gray-500 mt-1">
                          Billed {formatPriceCompact(price)} annually
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span className="text-sm">
                          {plan.features.posts_per_month === 'unlimited' 
                            ? 'Unlimited posts' 
                            : `${plan.features.posts_per_month} posts per month`}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span className="text-sm">
                          {plan.limits.connected_accounts === -1 
                            ? 'Unlimited accounts' 
                            : `Up to ${plan.limits.connected_accounts} social accounts`}
                        </span>
                      </li>
                      {plan.limits.ai_suggestions_per_month > 0 && (
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5" />
                          <span className="text-sm">
                            {plan.limits.ai_suggestions_per_month === -1 
                              ? 'Unlimited AI suggestions' 
                              : plan.limits.ai_suggestions_per_month === 300
                              ? '300 AI suggestions/month'
                              : `${plan.limits.ai_suggestions_per_month} AI suggestions/month`}
                          </span>
                        </li>
                      )}
                      {plan.features.analytics && (
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5" />
                          <span className="text-sm">
                            {plan.features.analytics === 'advanced' 
                              ? 'Advanced analytics' 
                              : 'Basic analytics'}
                          </span>
                        </li>
                      )}
                      {plan.features.team_features && (
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5" />
                          <span className="text-sm">Team collaboration</span>
                        </li>
                      )}
                      {plan.features.priority_support && (
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5" />
                          <span className="text-sm">Priority support</span>
                        </li>
                      )}
                    </ul>
                    
                    <Button 
                      className="w-full mt-4" 
                      variant={isCurrentPlan ? "outline" : "outline"}
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {isTrialing && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium">You&apos;re currently in a free trial</p>
                <p>Changing your plan will end your trial and start billing immediately.</p>
              </div>
            </div>
          )}
          
          {isLockedToAnnual && (
            <div className="text-center text-sm text-gray-600">
              <p>All plans shown are annual billing with discounted rates.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
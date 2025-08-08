'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientSubscription } from '@/lib/subscription/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { 
  TrendingUp, 
  Users, 
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Crown,
  Clock,
  DollarSign,
  Infinity
} from 'lucide-react'
import { format, isValid, parseISO } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/plans'
import { ChangePlanModal } from '@/components/billing/change-plan-modal'

// Helper function to safely parse and format dates
const formatDate = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return 'N/A'
  
  try {
    let date: Date
    
    if (typeof dateInput === 'string') {
      // Try parsing as ISO string
      date = parseISO(dateInput)
      if (!isValid(date)) {
        // Try direct Date constructor as fallback
        date = new Date(dateInput)
      }
    } else {
      date = dateInput
    }
    
    if (!isValid(date)) {
      console.error('Invalid date:', dateInput)
      return 'Invalid date'
    }
    
    return format(date, 'MMM d, yyyy')
  } catch (error) {
    console.error('Date formatting error:', error, 'Input:', dateInput)
    return 'Error'
  }
}

interface PaymentHistory {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
  description?: string
  metadata?: any
}

interface UsageData {
  posts_used: number
  posts_limit: number
  ai_suggestions_used: number
  ai_suggestions_limit: number
  connected_accounts_used: number
  connected_accounts_limit: number
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadBillingData()
    
    // Refresh data when page becomes visible (user navigates back)
    const handleFocus = () => {
      loadBillingData()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadBillingData = async () => {
    try {
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError

      // Get subscription
      const subData = await getClientSubscription()
      console.log('Subscription data received:', subData)
      setSubscription(subData)

      // Get payment history
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!paymentsError && payments) {
        console.log('Payment history loaded:', payments.length, 'entries')
        setPaymentHistory(payments)
      } else if (paymentsError) {
        console.error('Failed to load payment history:', paymentsError)
      }
      
      // If no payment history but user is on trial, add a virtual trial entry
      if ((!payments || payments.length === 0) && subData?.isTrialing) {
        const virtualTrialEntry = {
          id: 'virtual-trial',
          user_id: user.id,
          amount: 0,
          currency: 'usd',
          status: 'succeeded',
          description: `Started 7-day free trial for ${subData.planId.charAt(0).toUpperCase() + subData.planId.slice(1)} plan`,
          metadata: { type: 'trial_started', plan_id: subData.planId },
          created_at: new Date().toISOString()
        }
        setPaymentHistory([virtualTrialEntry])
      }

      // Get usage data
      const { data: usageData, error: usageError } = await supabase
        .rpc('get_usage_summary', { user_uuid: user.id })

      console.log('Usage data from RPC:', usageData)
      
      if (!usageError && usageData && usageData.length > 0) {
        // Use the first result from the array
        const usage = usageData[0]
        // Override limits based on current plan if RPC returns wrong values
        const currentPlan = SUBSCRIPTION_PLANS[subData?.planId || 'free']
        const enhancedUsage = {
          posts_used: usage.posts_used || 0,
          posts_limit: currentPlan.limits.posts_per_month,
          ai_suggestions_used: usage.ai_suggestions_used || 0,
          ai_suggestions_limit: currentPlan.limits.ai_suggestions_per_month,
          connected_accounts_used: usage.connected_accounts_used || 0,
          connected_accounts_limit: currentPlan.limits.connected_accounts
        }
        setUsage(enhancedUsage)
      } else {
        // Fallback to plan limits if RPC fails
        const currentPlan = SUBSCRIPTION_PLANS[subData?.planId || 'free']
        setUsage({
          posts_used: 0,
          posts_limit: currentPlan.limits.posts_per_month,
          ai_suggestions_used: 0,
          ai_suggestions_limit: currentPlan.limits.ai_suggestions_per_month,
          connected_accounts_used: 0,
          connected_accounts_limit: currentPlan.limits.connected_accounts
        })
      }

    } catch (error) {
      console.error('Error loading billing data:', error)
      toast.error('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }


  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      return
    }

    setCancelling(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately: false })
      })

      if (response.ok) {
        toast.success('Subscription cancelled. You will continue to have access until the end of your billing period.')
        loadBillingData() // Reload to show updated status
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Cancel error:', error)
      toast.error('Failed to cancel subscription')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const currentPlan = subscription?.planId ? SUBSCRIPTION_PLANS[subscription.planId as keyof typeof SUBSCRIPTION_PLANS] : SUBSCRIPTION_PLANS.free
  const isFreePlan = subscription?.planId === 'free' || !subscription?.hasSubscription

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    if (limit === 0) return 100 // No access
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600'
    if (percentage < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (status: string, metadata?: any) => {
    // Handle metadata that might be a string or object
    let parsedMetadata = metadata
    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata)
      } catch {
        parsedMetadata = {}
      }
    }
    
    // Check for special types in metadata
    if (parsedMetadata?.type === 'trial_started') {
      return <Sparkles className="h-4 w-4 text-blue-600" />
    }
    if (parsedMetadata?.type === 'plan_change') {
      return <TrendingUp className="h-4 w-4 text-purple-600" />
    }
    
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }
  
  const getPaymentAmount = (payment: PaymentHistory) => {
    // Handle metadata that might be a string or object
    let metadata = payment.metadata
    if (typeof payment.metadata === 'string') {
      try {
        metadata = JSON.parse(payment.metadata)
      } catch {
        metadata = {}
      }
    }
    
    if (metadata?.type === 'trial_started') {
      return 'Free Trial'
    }
    if (metadata?.type === 'plan_change' && payment.amount === 0) {
      return 'Plan Change'
    }
    return `$${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-gray-600 mt-1">Manage your subscription, billing, and usage</p>
      </div>

      {/* Current Plan Card */}
      <Card className={cn(
        "border-2",
        subscription?.hasSubscription ? "border-primary" : "border-gray-200"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {subscription?.hasSubscription ? (
                <Crown className="h-6 w-6 text-primary" />
              ) : (
                <Sparkles className="h-6 w-6 text-gray-400" />
              )}
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Your active subscription details</CardDescription>
              </div>
            </div>
            <Badge 
              variant={subscription?.hasSubscription ? "default" : "secondary"}
              className="text-lg px-3 py-1"
            >
              {currentPlan.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{subscription?.status || 'Active'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Billing Cycle</p>
              <p className="font-medium">{isFreePlan ? 'N/A' : subscription?.billingCycle ? subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1) : 'Monthly'}</p>
            </div>
            <div className="text-right">
              {subscription?.isTrialing && subscription?.trialEndsAt ? (
                <>
                  <p className="text-sm text-muted-foreground">Trial Ends</p>
                  <p className="font-medium">{formatDate(subscription.trialEndsAt)}</p>
                </>
              ) : subscription?.currentPeriodEnd && !isFreePlan ? (
                <>
                  <p className="text-sm text-muted-foreground">Renews On</p>
                  <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">&nbsp;</p>
                  <p className="font-medium">&nbsp;</p>
                </>
              )}
            </div>
          </div>

          {/* Manual Fix Button - Temporary */}
          {!subscription?.hasSubscription && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                If you've already purchased a subscription but it's not showing, click below to manually activate it:
              </p>
              <Button
                variant="outline"
                onClick={async () => {
                  const response = await fetch('/api/subscription/manual-fix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: 'starter', billingCycle: 'monthly' })
                  })
                  if (response.ok) {
                    toast.success('Subscription activated! Refreshing...')
                    setTimeout(() => window.location.reload(), 1000)
                  } else {
                    toast.error('Failed to activate subscription')
                  }
                }}
                className="w-full"
              >
                <Crown className="mr-2 h-4 w-4" />
                Manually Activate Starter Plan
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            {subscription?.hasSubscription ? (
              <Button 
                onClick={() => setShowChangePlanModal(true)}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Change Plan
              </Button>
            ) : (
              <Button asChild className="w-full flex items-center justify-center">
                <Link href="/#pricing" className="flex items-center">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade to Premium
                </Link>
              </Button>
            )}
          </div>
          {subscription?.hasSubscription && !isFreePlan && (
            <div className="pt-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="text-destructive hover:text-destructive w-full"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Subscription
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used this month</span>
                <span className={cn(
                  "font-medium flex items-center gap-1",
                  getUsageColor(getUsagePercentage(usage?.posts_used || 0, usage?.posts_limit || 0))
                )}>
                  <span>{usage?.posts_used || 0}</span>
                  <span>/</span>
                  {usage?.posts_limit === -1 ? (
                    <Infinity className="h-4 w-4" />
                  ) : (
                    <span>{usage?.posts_limit || 0}</span>
                  )}
                </span>
              </div>
              {usage?.posts_limit !== -1 && (
                <Progress 
                  value={getUsagePercentage(usage?.posts_used || 0, usage?.posts_limit || 0)} 
                  className="h-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Connected Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active accounts</span>
                <span className={cn(
                  "font-medium flex items-center gap-1",
                  getUsageColor(getUsagePercentage(usage?.connected_accounts_used || 0, usage?.connected_accounts_limit || 0))
                )}>
                  <span>{usage?.connected_accounts_used || 0}</span>
                  <span>/</span>
                  {usage?.connected_accounts_limit === -1 ? (
                    <Infinity className="h-4 w-4" />
                  ) : (
                    <span>{usage?.connected_accounts_limit || 0}</span>
                  )}
                </span>
              </div>
              {usage?.connected_accounts_limit !== -1 && (
                <Progress 
                  value={getUsagePercentage(usage?.connected_accounts_used || 0, usage?.connected_accounts_limit || 0)} 
                  className="h-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used this month</span>
                <span className={cn(
                  "font-medium flex items-center gap-1",
                  getUsageColor(getUsagePercentage(usage?.ai_suggestions_used || 0, usage?.ai_suggestions_limit || 0))
                )}>
                  <span>{usage?.ai_suggestions_used || 0}</span>
                  <span>/</span>
                  {usage?.ai_suggestions_limit === -1 ? (
                    <Infinity className="h-4 w-4" />
                  ) : (
                    <span>{usage?.ai_suggestions_limit || 0}</span>
                  )}
                </span>
              </div>
              {usage?.ai_suggestions_limit !== -1 && usage?.ai_suggestions_limit !== 0 && (
                <Progress 
                  value={getUsagePercentage(usage?.ai_suggestions_used || 0, usage?.ai_suggestions_limit || 0)} 
                  className="h-2"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Your recent transactions and invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory && paymentHistory.length > 0 ? (
            <div className="space-y-2">
              {paymentHistory.map((payment) => (
                <div 
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(payment.status, payment.metadata)}
                    <div>
                      <p className="font-medium">
                        {getPaymentAmount(payment)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {payment.description || 'Subscription payment'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {formatDate(payment.created_at)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {payment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No payment history yet</p>
              {isFreePlan && (
                <p className="text-sm mt-2">Upgrade to a paid plan to see your payment history</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      {isFreePlan && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>Unlock more features with a premium subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.values(SUBSCRIPTION_PLANS).slice(1).map((plan) => (
                <div 
                  key={plan.id}
                  className="p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                  <p className="text-2xl font-bold mb-3">
                    ${(plan.price_monthly / 100).toFixed(0)}<span className="text-sm font-normal">/month</span>
                  </p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {plan.features.posts_per_month === 'unlimited' ? 'Unlimited' : plan.features.posts_per_month} posts
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {plan.limits.connected_accounts === -1 ? 'Unlimited' : plan.limits.connected_accounts} accounts
                    </li>
                    {plan.features.ai_suggestions && (
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        AI suggestions
                      </li>
                    )}
                  </ul>
                  <Button asChild className="w-full" size="sm">
                    <Link href="/#pricing">
                      Select {plan.name}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Plan Modal */}
      {subscription && (
        <ChangePlanModal
          open={showChangePlanModal}
          onOpenChange={setShowChangePlanModal}
          currentPlanId={subscription?.planId || 'free'}
          currentBillingCycle={subscription?.billingCycle || 'monthly'}
          isTrialing={subscription?.isTrialing || false}
          onPlanChange={() => {
            loadBillingData()
            setShowChangePlanModal(false)
          }}
        />
      )}
    </div>
  )
}
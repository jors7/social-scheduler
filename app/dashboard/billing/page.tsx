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
  Infinity,
  CreditCard,
  Calendar,
  ChevronRight,
  Check,
  Settings
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
      date = parseISO(dateInput)
      if (!isValid(date)) {
        date = new Date(dateInput)
      }
    } else {
      date = dateInput
    }
    
    if (!isValid(date)) {
      return 'Invalid date'
    }
    
    return format(date, 'MMM d, yyyy')
  } catch (error) {
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
  stripe_invoice_id?: string
  stripe_payment_intent_id?: string
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
  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadBillingData()
    
    const handleFocus = () => {
      loadBillingData()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadBillingData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError

      const subData = await getClientSubscription()
      setSubscription(subData)

      // Try to sync payment history from Stripe first
      try {
        await fetch('/api/subscription/sync-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        // Clean up duplicate payments after syncing
        await fetch('/api/subscription/clean-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (syncError) {
        console.log('Could not sync payments from Stripe:', syncError)
      }

      const { data: payments, error: paymentsError } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!paymentsError && payments) {
        setPaymentHistory(payments)
      }

      const { data: usageData, error: usageError } = await supabase
        .rpc('get_usage_summary', { user_uuid: user.id })
      
      if (!usageError && usageData && usageData.length > 0) {
        const usage = usageData[0]
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

  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="text-center py-16 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-fit mx-auto mb-6">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading billing information...</h3>
          <p className="text-gray-600">Please wait while we load your subscription details</p>
        </CardContent>
      </Card>
    )
  }

  const currentPlan = subscription?.planId ? SUBSCRIPTION_PLANS[subscription.planId as keyof typeof SUBSCRIPTION_PLANS] : SUBSCRIPTION_PLANS.free
  const isFreePlan = subscription?.planId === 'free' || !subscription?.hasSubscription

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0
    if (limit === 0) return 100
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (used: number, limit: number) => {
    const percentage = getUsagePercentage(used, limit)
    if (percentage < 50) return ''
    if (percentage < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Billing & Subscription
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Manage your subscription, billing, and usage</p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Plan Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan Card */}
          <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden hover:-translate-y-0.5">
            <CardHeader className="border-b pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Subscription Plan
                </CardTitle>
                <Badge 
                  variant={subscription?.hasSubscription ? "default" : "secondary"}
                  className={cn(
                    "text-sm font-semibold px-4 py-2 rounded-xl shadow-lg border-0 min-w-[80px] justify-center",
                    subscription?.hasSubscription 
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-emerald-200" 
                      : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-gray-200"
                  )}
                >
                  {subscription?.hasSubscription ? 'Active' : 'Free'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Plan Info */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-xl shadow-sm",
                    subscription?.hasSubscription 
                      ? "bg-gradient-to-r from-purple-100 to-blue-100" 
                      : "bg-white"
                  )}>
                    {subscription?.hasSubscription ? (
                      <Crown className="h-6 w-6 text-purple-600" />
                    ) : (
                      <Sparkles className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {subscription?.billingCycle === 'yearly' ? 'Annual billing' : 'Monthly billing'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    ${subscription?.billingCycle === 'yearly' 
                      ? (currentPlan.price_yearly / 100).toFixed(0)
                      : (currentPlan.price_monthly / 100).toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    /{subscription?.billingCycle === 'yearly' ? 'year' : 'month'}
                  </p>
                </div>
              </div>

              {/* Billing Details */}
              {subscription?.hasSubscription && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Next billing date</p>
                    <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Payment method</p>
                    <p className="font-medium flex items-center gap-1">
                      <CreditCard className="h-4 w-4" />
                      •••• 4242
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {subscription?.hasSubscription ? (
                  <>
                    <Button 
                      onClick={() => setShowChangePlanModal(true)}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                      Change Plan
                    </Button>
                    
                    {/* Debug button - REMOVE IN PRODUCTION */}
                    <Button 
                      onClick={async () => {
                        console.log('Testing upgrade to Enterprise...')
                        const response = await fetch('/api/subscription/debug-change', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            newPlanId: 'enterprise',
                            billingCycle: 'monthly'
                          })
                        })
                        const data = await response.json()
                        console.log('Debug response:', data)
                        alert(JSON.stringify(data, null, 2))
                        if (data.payment_url) {
                          window.location.href = data.payment_url
                        }
                      }}
                      variant="outline"
                      className="ml-2"
                    >
                      Debug
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      onClick={() => {
                        fetch('/api/stripe/portal', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        })
                        .then(res => res.json())
                        .then(data => {
                          if (data.url) {
                            window.location.href = data.url
                          } else {
                            toast.error(data.error || 'Failed to open billing portal')
                          }
                        })
                        .catch(() => toast.error('Failed to open billing portal'))
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </Button>
                  </>
                ) : (
                  <Button asChild className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <Link href="/#pricing">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Upgrade Plan
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden hover:-translate-y-0.5">
            <CardHeader className="border-b pb-6">
              <CardTitle className="text-xl">
                Payment History
              </CardTitle>
              <CardDescription className="mt-2">Your recent transactions and invoices</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-muted-foreground">No payment history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium">${(payment.amount / 100).toFixed(2)} USD</p>
                          <p className="text-sm text-muted-foreground">{payment.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.created_at)}
                        </p>
                        {payment.stripe_invoice_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-gray-100 hover:-translate-y-0.5 transition-all duration-200"
                            onClick={() => {
                              // Open Stripe customer portal or invoice URL
                              fetch('/api/stripe/invoice-url', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ invoiceId: payment.stripe_invoice_id })
                              })
                              .then(res => res.json())
                              .then(data => {
                                if (data.url) {
                                  window.open(data.url, '_blank')
                                } else {
                                  toast.error('Could not retrieve invoice')
                                }
                              })
                              .catch(() => toast.error('Failed to get invoice URL'))
                            }}
                          >
                            <FileText className="h-4 w-4" />
                            Invoice
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Usage Stats */}
        <div className="space-y-6">
          <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 rounded-xl hover:-translate-y-0.5">
            <CardHeader className="border-b pb-6">
              <CardTitle className="text-lg">
                Usage This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Posts Usage */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Posts</span>
                  <span className={cn(
                    "text-sm font-medium",
                    getUsageColor(usage?.posts_used || 0, usage?.posts_limit || 0)
                  )}>
                    {usage?.posts_used || 0} / {usage?.posts_limit === -1 ? '∞' : usage?.posts_limit || 0}
                  </span>
                </div>
                {usage?.posts_limit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(usage?.posts_used || 0, usage?.posts_limit || 0)} 
                    className="h-2"
                  />
                )}
              </div>

              {/* Connected Accounts */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Connected Accounts</span>
                  <span className={cn(
                    "text-sm font-medium",
                    getUsageColor(usage?.connected_accounts_used || 0, usage?.connected_accounts_limit || 0)
                  )}>
                    {usage?.connected_accounts_used || 0} / {usage?.connected_accounts_limit === -1 ? '∞' : usage?.connected_accounts_limit || 0}
                  </span>
                </div>
                {usage?.connected_accounts_limit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(usage?.connected_accounts_used || 0, usage?.connected_accounts_limit || 0)} 
                    className="h-2"
                  />
                )}
              </div>

              {/* AI Suggestions */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">AI Suggestions</span>
                  <span className={cn(
                    "text-sm font-medium",
                    getUsageColor(usage?.ai_suggestions_used || 0, usage?.ai_suggestions_limit || 0)
                  )}>
                    {usage?.ai_suggestions_used || 0} / {usage?.ai_suggestions_limit === -1 ? '∞' : usage?.ai_suggestions_limit || 0}
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

          {/* Plan Features */}
          <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border-0 rounded-xl hover:-translate-y-0.5">
            <CardHeader className="border-b pb-6">
              <CardTitle className="text-lg">
                Plan Features
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-2">
                {currentPlan.features.posts_per_month !== 0 && (
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">
                      {currentPlan.features.posts_per_month === 'unlimited' 
                        ? 'Unlimited posts per month'
                        : `${currentPlan.features.posts_per_month} posts per month`}
                    </span>
                  </li>
                )}
                {currentPlan.features.platforms !== 0 && (
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">
                      {currentPlan.features.platforms === 'all' 
                        ? 'All social platforms'
                        : `Connect ${currentPlan.features.platforms} platforms`}
                    </span>
                  </li>
                )}
                {currentPlan.features.analytics && (
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">
                      {currentPlan.features.analytics === 'advanced' 
                        ? 'Advanced analytics'
                        : 'Basic analytics'}
                    </span>
                  </li>
                )}
                {currentPlan.features.ai_suggestions && (
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">AI-powered suggestions</span>
                  </li>
                )}
                {currentPlan.features.team_features && (
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">Team collaboration</span>
                  </li>
                )}
                {currentPlan.features.priority_support && (
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">Priority support</span>
                  </li>
                )}
                {isFreePlan && (
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className="text-sm text-gray-500">Limited features available</span>
                  </li>
                )}
              </ul>
              {!subscription?.hasSubscription && (
                <Button asChild variant="outline" className="w-full mt-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <Link href="/#pricing">
                    View all plans
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showChangePlanModal && (
        <ChangePlanModal
          open={showChangePlanModal}
          onOpenChange={setShowChangePlanModal}
          currentPlanId={subscription?.planId || 'free'}
          currentBillingCycle={subscription?.billingCycle || 'monthly'}
          isTrialing={subscription?.isTrialing || false}
          onPlanChange={() => {
            loadBillingData()
            toast.success('Plan changed successfully!')
          }}
        />
      )}
    </div>
  )
}
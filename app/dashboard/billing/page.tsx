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
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Users, 
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Crown,
  Shield,
  Zap,
  Clock,
  DollarSign,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/plans'

interface PaymentHistory {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
  description?: string
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
  const [redirecting, setRedirecting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError

      // Get subscription
      const subData = await getClientSubscription()
      setSubscription(subData)

      // Get payment history
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!paymentsError && payments) {
        setPaymentHistory(payments)
      }

      // Get usage data
      const { data: usageData, error: usageError } = await supabase
        .rpc('get_usage_summary', { user_uuid: user.id })

      if (!usageError && usageData) {
        setUsage(usageData)
      }

    } catch (error) {
      console.error('Error loading billing data:', error)
      toast.error('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setRedirecting(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else if (data.redirect) {
        window.location.href = data.redirect
      } else {
        toast.error(data.error || 'Failed to open billing portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
      toast.error('Failed to open billing portal')
    } finally {
      setRedirecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const currentPlan = subscription?.planId ? SUBSCRIPTION_PLANS[subscription.planId] : SUBSCRIPTION_PLANS.free
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{subscription?.status || 'Active'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Cycle</p>
              <p className="font-medium">{isFreePlan ? 'N/A' : 'Monthly'}</p>
            </div>
            {subscription?.isTrialing && (
              <div>
                <p className="text-sm text-muted-foreground">Trial Ends</p>
                <p className="font-medium">
                  {subscription.trialEndsAt ? format(new Date(subscription.trialEndsAt), 'MMM d, yyyy') : 'N/A'}
                </p>
              </div>
            )}
            {subscription?.currentPeriodEnd && !isFreePlan && (
              <div>
                <p className="text-sm text-muted-foreground">Renews On</p>
                <p className="font-medium">
                  {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            {subscription?.hasSubscription ? (
              <>
                <Button 
                  onClick={handleManageSubscription}
                  disabled={redirecting}
                  className="flex-1"
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening Portal...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/#pricing">
                    Change Plan
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild className="flex-1">
                <Link href="/#pricing">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade to Premium
                </Link>
              </Button>
            )}
          </div>
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
                  "font-medium",
                  getUsageColor(getUsagePercentage(usage?.posts_used || 0, usage?.posts_limit || 0))
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
                  "font-medium",
                  getUsageColor(getUsagePercentage(usage?.connected_accounts_used || 0, usage?.connected_accounts_limit || 0))
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
                  "font-medium",
                  getUsageColor(getUsagePercentage(usage?.ai_suggestions_used || 0, usage?.ai_suggestions_limit || 0))
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
          {paymentHistory.length > 0 ? (
            <div className="space-y-2">
              {paymentHistory.map((payment) => (
                <div 
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(payment.status)}
                    <div>
                      <p className="font-medium">
                        ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {payment.description || 'Subscription payment'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {format(new Date(payment.created_at), 'MMM d, yyyy')}
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
    </div>
  )
}
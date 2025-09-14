import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { SUBSCRIPTION_PLANS, PlanId, BillingCycle } from '@/lib/subscription/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId, billingCycle } = await request.json() as {
      planId: PlanId
      billingCycle: BillingCycle
    }

    // Validate plan
    const plan = SUBSCRIPTION_PLANS[planId]
    if (!plan || plan.id === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get user's current subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, plan_id, billing_cycle, current_period_end, status')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    // Calculate new plan price
    const newPlanPrice = billingCycle === 'yearly' 
      ? plan.price_yearly 
      : plan.price_monthly

    // If no existing subscription, return full price
    if (!subscription?.stripe_subscription_id || 
        !['active', 'trialing'].includes(subscription.status)) {
      return NextResponse.json({
        currentPlan: subscription?.plan_id || 'free',
        newPlan: planId,
        billingCycle,
        fullPrice: newPlanPrice,
        credit: 0,
        amountDue: newPlanPrice,
        currency: 'usd',
        hasExistingSubscription: false,
        immediateCharge: true,
        description: `Full price for ${plan.name} plan (${billingCycle})`
      })
    }

    try {
      // Get the current subscription from Stripe
      const stripeSubscriptionResponse = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id,
        {
          expand: ['items.data.price']
        }
      )
      
      // Cast to any to handle the Response wrapper
      const stripeSubscription = stripeSubscriptionResponse as any

      // Calculate proration for immediate cancellation
      const now = Math.floor(Date.now() / 1000)
      const periodEnd = stripeSubscription.current_period_end
      const periodStart = stripeSubscription.current_period_start
      
      // Calculate unused time ratio
      const totalPeriodSeconds = periodEnd - periodStart
      const unusedSeconds = periodEnd - now
      const unusedRatio = unusedSeconds / totalPeriodSeconds
      
      // Get current plan price
      const currentPrice = stripeSubscription.items.data[0]?.price as any
      const currentAmount = (currentPrice?.unit_amount || 0) / 100
      
      // Calculate credit for unused time
      const creditAmount = Math.round(currentAmount * unusedRatio * 100) / 100
      
      // Calculate what user will pay
      const amountDue = Math.max(0, newPlanPrice - creditAmount)
      
      // Format dates for display
      const currentPeriodEnd = new Date(periodEnd * 1000)
      const daysRemaining = Math.ceil(unusedSeconds / (24 * 60 * 60))
      
      return NextResponse.json({
        currentPlan: subscription.plan_id,
        currentPlanPrice: currentAmount,
        newPlan: planId,
        newPlanPrice,
        billingCycle,
        fullPrice: newPlanPrice,
        credit: creditAmount,
        amountDue,
        currency: 'usd',
        hasExistingSubscription: true,
        immediateCharge: true,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        daysRemaining,
        description: `Upgrade to ${plan.name} plan with ${daysRemaining} days credit from current plan`,
        breakdown: {
          newPlanCharge: newPlanPrice,
          prorationCredit: -creditAmount,
          total: amountDue
        }
      })
      
    } catch (stripeError: any) {
      console.error('Error calculating proration:', stripeError)
      
      // Fallback to simple calculation if Stripe call fails
      return NextResponse.json({
        currentPlan: subscription.plan_id,
        newPlan: planId,
        billingCycle,
        fullPrice: newPlanPrice,
        credit: 0,
        amountDue: newPlanPrice,
        currency: 'usd',
        hasExistingSubscription: true,
        immediateCharge: true,
        description: `Upgrade to ${plan.name} plan`,
        error: 'Could not calculate exact proration'
      })
    }
    
  } catch (error) {
    console.error('Preview upgrade error:', error)
    return NextResponse.json(
      { error: 'Failed to preview upgrade' },
      { status: 500 }
    )
  }
}
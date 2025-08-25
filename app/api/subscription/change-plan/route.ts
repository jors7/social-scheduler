import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { SUBSCRIPTION_PLANS, PlanId, BillingCycle } from '@/lib/subscription/plans'
import { syncStripeSubscriptionToDatabase } from '@/lib/subscription/sync'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function POST(request: NextRequest) {
  console.log('=== Change Plan API Called ===')
  
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

    const { newPlanId, billingCycle } = await request.json() as {
      newPlanId: PlanId
      billingCycle: BillingCycle
    }
    
    console.log('Change plan request:', { newPlanId, billingCycle, userId: user.id })

    // Validate plan
    const newPlan = SUBSCRIPTION_PLANS[newPlanId]
    if (!newPlan || newPlan.id === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get user's current subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription?.stripe_subscription_id) {
      console.error('No subscription found:', subError)
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }
    
    console.log('Current subscription:', subscription.plan_id, subscription.billing_cycle)

    // Get the Stripe subscription
    console.log('Retrieving Stripe subscription:', subscription.stripe_subscription_id)
    
    let stripeSubscription
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
      console.log('Stripe subscription status:', stripeSubscription.status)
    } catch (stripeError: any) {
      console.error('Failed to retrieve Stripe subscription:', stripeError)
      
      // If subscription doesn't exist in Stripe, it might be a manual one
      if (stripeError.code === 'resource_missing' || subscription.stripe_subscription_id.startsWith('manual_')) {
        console.log('Manual subscription detected, creating new subscription in Stripe')
        
        // Create a new checkout session instead
        return NextResponse.json({
          error: 'Manual subscription detected. Please use checkout to set up Stripe subscription.',
          requiresCheckout: true
        }, { status: 400 })
      }
      
      throw stripeError
    }

    // Determine the new price ID
    let newPriceId = billingCycle === 'yearly' 
      ? newPlan.stripe_price_id_yearly 
      : newPlan.stripe_price_id_monthly

    // If price ID is not configured, create one on the fly (for development)
    if (!newPriceId) {
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: billingCycle === 'yearly' ? newPlan.price_yearly : newPlan.price_monthly,
        recurring: {
          interval: billingCycle === 'yearly' ? 'year' : 'month',
        },
        product_data: {
          name: `${newPlan.name} Plan`,
          metadata: {
            plan_id: newPlan.id,
            description: newPlan.description,
          },
        },
      })
      newPriceId = price.id
    }

    // Get the current subscription item
    const currentItem = stripeSubscription.items.data[0]
    if (!currentItem) {
      return NextResponse.json({ error: 'No subscription items found' }, { status: 400 })
    }

    // Determine proration behavior
    const currentPlan = SUBSCRIPTION_PLANS[subscription.plan_id as PlanId]
    const isUpgrade = newPlan.price_monthly > currentPlan.price_monthly
    
    // Update the subscription
    let updatedSubscription: any
    try {
      updatedSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          items: [{
            id: currentItem.id,
            price: newPriceId,
          }],
          // For upgrades, charge immediately. For downgrades, wait until period end
          proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
          // IMPORTANT: End any trial immediately when changing plans
          trial_end: 'now',
          // For upgrades, also set payment behavior to charge immediately
          ...(isUpgrade && {
            payment_behavior: 'default_incomplete',
            billing_cycle_anchor: 'now',
          }),
          metadata: {
            user_id: user.id,
            plan_id: newPlanId,
            billing_cycle: billingCycle,
          },
        }
      )
    } catch (stripeUpdateError: any) {
      console.error('Stripe subscription update failed:', stripeUpdateError)
      
      // Check if it's a payment method issue
      if (stripeUpdateError.code === 'card_declined' || 
          stripeUpdateError.code === 'payment_intent_authentication_failure' ||
          stripeUpdateError.raw?.param === 'payment_behavior') {
        return NextResponse.json({
          error: 'Payment method issue. Please update your payment method and try again.',
          code: 'payment_required'
        }, { status: 400 })
      }
      
      // Re-throw for general error handling
      throw stripeUpdateError
    }

    // Sync the updated subscription to database using our centralized sync function
    console.log('Syncing updated subscription to database...')
    const syncResult = await syncStripeSubscriptionToDatabase(
      subscription.stripe_subscription_id,
      user.id
    )
    
    if (!syncResult.success) {
      console.error('Error syncing subscription to database:', syncResult.error)
      // Don't fail the request since Stripe update succeeded
      // The webhook will also try to sync
    } else {
      console.log('Successfully synced subscription to database')
    }

    // Record the plan change in payment history
    const changeDescription = isUpgrade 
      ? `Upgraded to ${newPlan.name} plan (${billingCycle})` 
      : `Changed to ${newPlan.name} plan (${billingCycle})`
    
    await supabase
      .from('payment_history')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        amount: 0, // Actual charge will be recorded by webhook
        currency: 'usd',
        status: 'pending',
        description: changeDescription,
        metadata: { 
          type: 'plan_change', 
          old_plan: subscription.plan_id,
          new_plan: newPlanId,
          billing_cycle: billingCycle
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: isUpgrade 
        ? 'Plan upgraded successfully. You will be charged the prorated amount immediately.'
        : 'Plan changed successfully. Changes will take effect at the end of your current billing period.',
      subscription: updatedSubscription
    })

  } catch (error: any) {
    console.error('=== CHANGE PLAN ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Full error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to change subscription plan',
        details: error?.message || 'Unknown error',
        code: error?.code
      },
      { status: 500 }
    )
  }
}
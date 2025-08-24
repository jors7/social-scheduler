import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function GET(request: NextRequest) {
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Verifying Stripe status for:', user.email)

    // Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: user.email!,
      limit: 5
    })

    if (customers.data.length === 0) {
      return NextResponse.json({
        error: 'No Stripe customer found',
        message: 'You do not have a Stripe customer account',
        action_needed: 'Create a new subscription through checkout'
      })
    }

    const customer = customers.data[0]
    console.log('Found customer:', customer.id)

    // Get all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10
    })

    // Get the active/trialing subscription if any
    const activeSubscription = subscriptions.data.find(
      sub => ['active', 'trialing', 'past_due'].includes(sub.status)
    )

    if (!activeSubscription) {
      return NextResponse.json({
        stripe_customer: {
          id: customer.id,
          email: customer.email,
          created: new Date(customer.created * 1000).toISOString()
        },
        subscription: null,
        message: 'No active subscription in Stripe',
        all_subscriptions: subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          created: new Date(sub.created * 1000).toISOString(),
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null
        })),
        action_needed: 'You need to subscribe through the checkout page to get a real subscription'
      })
    }

    // Get the price details
    const item = activeSubscription.items.data[0]
    const price = item.price

    // Determine the plan from price
    let detectedPlan = 'unknown'
    let detectedCycle = 'unknown'
    
    if (price.unit_amount) {
      const amount = price.unit_amount / 100
      const interval = price.recurring?.interval
      
      if (interval === 'month') {
        if (amount === 9) detectedPlan = 'starter'
        else if (amount === 19) detectedPlan = 'professional'
        else if (amount === 29) detectedPlan = 'enterprise'
        detectedCycle = 'monthly'
      } else if (interval === 'year') {
        if (amount === 90) detectedPlan = 'starter'
        else if (amount === 190) detectedPlan = 'professional'
        else if (amount === 290) detectedPlan = 'enterprise'
        detectedCycle = 'yearly'
      }
    }

    return NextResponse.json({
      stripe_customer: {
        id: customer.id,
        email: customer.email,
        created: new Date(customer.created * 1000).toISOString()
      },
      active_subscription: {
        id: activeSubscription.id,
        status: activeSubscription.status,
        current_period_start: new Date((activeSubscription as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((activeSubscription as any).current_period_end * 1000).toISOString(),
        trial_end: (activeSubscription as any).trial_end ? new Date((activeSubscription as any).trial_end * 1000).toISOString() : null,
        cancel_at: (activeSubscription as any).cancel_at ? new Date((activeSubscription as any).cancel_at * 1000).toISOString() : null,
        canceled_at: (activeSubscription as any).canceled_at ? new Date((activeSubscription as any).canceled_at * 1000).toISOString() : null
      },
      detected_plan: {
        plan: detectedPlan,
        billing_cycle: detectedCycle,
        price: price.unit_amount ? price.unit_amount / 100 : 0,
        currency: price.currency,
        price_id: price.id
      },
      metadata: (activeSubscription as any).metadata,
      message: `You have an active ${detectedPlan} subscription (${detectedCycle}) in Stripe`,
      action_needed: detectedPlan === 'starter' ? 'Use the Change Plan feature to upgrade to Professional' : null
    })

  } catch (error: any) {
    console.error('Stripe verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify Stripe status', details: error.message },
      { status: 500 }
    )
  }
}
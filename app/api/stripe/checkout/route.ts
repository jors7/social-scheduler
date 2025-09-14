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

    // Get or create Stripe customer
    let customerId: string | undefined

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .single()

    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id
      
      // CRITICAL: Cancel any existing active subscriptions with proration
      if (subscription.stripe_subscription_id && 
          ['active', 'trialing'].includes(subscription.status)) {
        console.log(`Canceling existing subscription ${subscription.stripe_subscription_id} with proration`)
        try {
          // Cancel immediately with proration
          // This will create a credit for unused time that automatically applies to the new subscription
          const canceledSubscription = await stripe.subscriptions.cancel(
            subscription.stripe_subscription_id,
            {
              prorate: true,
              invoice_now: true, // Generate credit invoice immediately
              expand: ['latest_invoice']
            }
          )
          
          // Log the proration details
          const latestInvoice = canceledSubscription.latest_invoice as any
          if (latestInvoice && latestInvoice.total < 0) {
            console.log(`Proration credit generated: ${Math.abs(latestInvoice.total / 100)} ${latestInvoice.currency.toUpperCase()}`)
          }
          
          console.log(`Successfully canceled subscription ${subscription.stripe_subscription_id} with proration`)
        } catch (cancelError) {
          console.error('Error canceling existing subscription:', cancelError)
          // Continue anyway - better to allow upgrade than block it
        }
      }
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id
    }

    // Get the correct price ID
    const priceId = billingCycle === 'yearly' 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly

    if (!priceId) {
      // Create price on the fly if not configured (for development)
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly,
        recurring: {
          interval: billingCycle === 'yearly' ? 'year' : 'month',
        },
        product_data: {
          name: `${plan.name} Plan`,
          metadata: {
            plan_id: plan.id,
            description: plan.description,
          },
        },
      })
      
      // Use the newly created price
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#pricing`,
        // Allow promotion codes and apply any credit balance automatically
        allow_promotion_codes: true,
        customer_update: {
          address: 'auto',
        },
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle,
          upgrade_with_proration: subscription?.stripe_subscription_id ? 'true' : 'false',
        },
        subscription_data: {
          trial_period_days: plan.features.trial_days,
          metadata: {
            user_id: user.id,
            plan_id: planId,
            billing_cycle: billingCycle,
          },
        },
      })

      return NextResponse.json({ url: session.url })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#pricing`,
      // Allow promotion codes and apply any credit balance automatically
      allow_promotion_codes: true,
      customer_update: {
        address: 'auto',
      },
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        upgrade_with_proration: subscription?.stripe_subscription_id ? 'true' : 'false',
      },
      subscription_data: {
        trial_period_days: plan.features.trial_days,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle,
        },
      },
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
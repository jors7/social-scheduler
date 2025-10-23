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

    // Check if user is authenticated (optional for new trial signups)
    const { data: { user } } = await supabase.auth.getUser()

    const { planId, billingCycle, email } = await request.json() as {
      planId: PlanId
      billingCycle: BillingCycle
      email?: string
    }

    // For non-authenticated users, require email
    if (!user && !email) {
      return NextResponse.json({ error: 'Email required for new signups' }, { status: 400 })
    }

    // Validate plan
    const plan = SUBSCRIPTION_PLANS[planId]
    if (!plan || plan.id === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId: string | undefined
    let userId: string | undefined = user?.id
    const customerEmail = user?.email || email!

    // For authenticated users, check existing subscription
    if (user) {
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
      }
    }

    // Create Stripe customer if not exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          supabase_user_id: userId || 'pending', // Will be updated in webhook after account creation
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
        customer_email: !user ? customerEmail : undefined, // Only set if no existing customer
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/stripe?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#pricing`,
        // Collect only minimal data (name is always collected by Stripe)
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        metadata: {
          user_id: userId || 'new_signup',
          user_email: customerEmail,
          plan_id: planId,
          billing_cycle: billingCycle,
          is_new_signup: !user ? 'true' : 'false',
        },
        subscription_data: {
          trial_period_days: plan.features.trial_days,
          metadata: {
            user_id: userId || 'pending',
            user_email: customerEmail,
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
      customer_email: !user ? customerEmail : undefined, // Only set if no existing customer
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/stripe?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#pricing`,
      // Collect only minimal data (name is always collected by Stripe)
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        user_id: userId || 'new_signup',
        user_email: customerEmail,
        plan_id: planId,
        billing_cycle: billingCycle,
        is_new_signup: !user ? 'true' : 'false',
      },
      subscription_data: {
        trial_period_days: plan.features.trial_days,
        metadata: {
          user_id: userId || 'pending',
          user_email: customerEmail,
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
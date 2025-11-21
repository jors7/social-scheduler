import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { SUBSCRIPTION_PLANS, PlanId, BillingCycle } from '@/lib/subscription/plans'
import { validateStripeKeys } from '@/lib/stripe/validation'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function POST(request: NextRequest) {
  // Validate Stripe keys at runtime
  validateStripeKeys()

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

    const { planId, billingCycle, email, endorsely_referral } = await request.json() as {
      planId: PlanId
      billingCycle: BillingCycle
      email?: string
      endorsely_referral?: string
    }

    // =====================================================
    // AFFILIATE TRACKING
    // =====================================================
    // Check for affiliate referral cookie
    let affiliateId: string | undefined
    const referralCode = cookieStore.get('socialcal_referral')?.value

    if (referralCode) {
      console.log('🔗 Affiliate referral detected:', referralCode)

      // Look up affiliate by referral code
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, referral_code')
        .eq('referral_code', referralCode)
        .eq('status', 'active')
        .single()

      if (affiliate) {
        affiliateId = affiliate.id
        console.log('✅ Affiliate found:', affiliate.id)
      } else {
        console.log('⚠️ Affiliate not found for code:', referralCode)
      }
    }
    // END AFFILIATE TRACKING
    // =====================================================

    // For non-authenticated users, Stripe will collect email during checkout
    // So we don't require it here

    // Validate plan
    const plan = SUBSCRIPTION_PLANS[planId]
    if (!plan || plan.id === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId: string | undefined
    let userId: string | undefined = user?.id
    const customerEmail = user?.email || email || undefined // Stripe will collect if undefined

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
      const customerData: any = {
        metadata: {
          supabase_user_id: userId || 'pending', // Will be updated in webhook after account creation
        },
      }

      // Only set email if we have it (for authenticated users)
      if (customerEmail) {
        customerData.email = customerEmail
      }

      const customer = await stripe.customers.create(customerData)
      customerId = customer.id
    }

    // Get the correct price ID
    const priceId = billingCycle === 'yearly'
      ? plan.stripe_price_id_yearly
      : plan.stripe_price_id_monthly

    if (!priceId) {
      console.error('Missing Stripe price ID for plan:', planId, 'billing cycle:', billingCycle)
      return NextResponse.json(
        {
          error: 'Configuration error: Stripe price ID not configured for this plan',
          details: 'Please contact support or check your environment variables'
        },
        { status: 500 }
      )
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
        user_email: customerEmail || 'pending',
        plan_id: planId,
        billing_cycle: billingCycle,
        is_new_signup: !user ? 'true' : 'false',
        ...(endorsely_referral && { endorsely_referral }),
        ...(affiliateId && { affiliate_id: affiliateId }),
      },
      subscription_data: {
        trial_period_days: plan.features.trial_days,
        metadata: {
          user_id: userId || 'pending',
          user_email: customerEmail || 'pending',
          plan_id: planId,
          billing_cycle: billingCycle,
          ...(endorsely_referral && { endorsely_referral }),
          ...(affiliateId && { affiliate_id: affiliateId }),
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
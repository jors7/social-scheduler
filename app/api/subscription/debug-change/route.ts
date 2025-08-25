import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { SUBSCRIPTION_PLANS, PlanId, BillingCycle } from '@/lib/subscription/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function POST(request: NextRequest) {
  console.log('=== DEBUG CHANGE PLAN API Called ===')
  
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
    
    console.log('Debug change plan request:', { newPlanId, billingCycle, userId: user.id, email: user.email })

    // Get user's current subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription?.stripe_subscription_id) {
      return NextResponse.json({ 
        error: 'No subscription found',
        details: subError,
        subscription: subscription
      }, { status: 404 })
    }
    
    console.log('Current subscription in DB:', {
      plan_id: subscription.plan_id,
      billing_cycle: subscription.billing_cycle,
      status: subscription.status,
      stripe_subscription_id: subscription.stripe_subscription_id
    })

    // Get the Stripe subscription
    let stripeSubscription
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id, {
        expand: ['items.data.price', 'latest_invoice']
      })
      console.log('Stripe subscription:', {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_end: new Date((stripeSubscription as any).current_period_end * 1000),
        trial_end: (stripeSubscription as any).trial_end ? new Date((stripeSubscription as any).trial_end * 1000) : null,
        items: stripeSubscription.items.data.map(item => ({
          id: item.id,
          price_id: item.price.id,
          amount: (item.price.unit_amount || 0) / 100,
          interval: item.price.recurring?.interval
        }))
      })
    } catch (stripeError: any) {
      return NextResponse.json({ 
        error: 'Failed to retrieve Stripe subscription',
        details: stripeError.message,
        code: stripeError.code
      }, { status: 500 })
    }

    // Validate the new plan
    const newPlan = SUBSCRIPTION_PLANS[newPlanId]
    const currentPlan = SUBSCRIPTION_PLANS[subscription.plan_id as PlanId]
    
    // Determine the new price ID
    let newPriceId = billingCycle === 'yearly' 
      ? newPlan.stripe_price_id_yearly 
      : newPlan.stripe_price_id_monthly

    console.log('Price IDs:', {
      current_price_id: stripeSubscription.items.data[0]?.price.id,
      new_price_id: newPriceId,
      needs_creation: !newPriceId
    })

    // If price ID is not configured, create one
    if (!newPriceId) {
      console.log('Creating new price...')
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: billingCycle === 'yearly' ? newPlan.price_yearly : newPlan.price_yearly,
        recurring: {
          interval: billingCycle === 'yearly' ? 'year' : 'month',
        },
        product_data: {
          name: `${newPlan.name} Plan`,
        },
      })
      newPriceId = price.id
      console.log('Created price:', price.id)
    }

    // Calculate if it's an upgrade
    const currentPrice = subscription.billing_cycle === 'yearly' 
      ? currentPlan.price_yearly 
      : currentPlan.price_monthly
    
    const newPrice = billingCycle === 'yearly' 
      ? newPlan.price_yearly 
      : newPlan.price_monthly
    
    const isUpgrade = newPlan.price_monthly > currentPlan.price_monthly || 
                     (newPlan.id === currentPlan.id && billingCycle === 'yearly' && subscription.billing_cycle === 'monthly')

    console.log('Upgrade detection:', {
      current_plan: currentPlan.id,
      new_plan: newPlan.id,
      current_price: currentPrice / 100,
      new_price: newPrice / 100,
      is_upgrade: isUpgrade,
      current_billing: subscription.billing_cycle,
      new_billing: billingCycle
    })

    // Try to update the subscription
    console.log('Attempting subscription update...')
    let updatedSubscription
    try {
      const updateParams: any = {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
        trial_end: 'now',
      }

      if (isUpgrade) {
        updateParams.payment_behavior = 'default_incomplete'
        updateParams.billing_cycle_anchor = 'now'
      }

      console.log('Update params:', updateParams)
      
      updatedSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        updateParams
      )

      console.log('Update successful:', {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        latest_invoice: (updatedSubscription as any).latest_invoice
      })
    } catch (updateError: any) {
      console.error('Update failed:', updateError)
      return NextResponse.json({
        error: 'Subscription update failed',
        details: updateError.message,
        code: updateError.code,
        type: updateError.type
      }, { status: 500 })
    }

    // Check for invoices
    const invoices = await stripe.invoices.list({
      subscription: subscription.stripe_subscription_id,
      limit: 3
    })

    console.log('Recent invoices:', invoices.data.map(inv => ({
      id: inv.id,
      status: inv.status,
      amount_due: inv.amount_due / 100,
      amount_paid: inv.amount_paid / 100,
      created: new Date(inv.created * 1000),
      payment_intent: (inv as any).payment_intent
    })))

    // Check if there's an unpaid invoice
    const unpaidInvoice = invoices.data.find(inv => 
      inv.status === 'open' && inv.amount_due > 0
    )

    if (unpaidInvoice) {
      console.log('Found unpaid invoice:', unpaidInvoice.id)
      
      // Try to pay it
      try {
        const paidInvoice = await stripe.invoices.pay(unpaidInvoice.id)
        console.log('Invoice paid successfully')
        
        return NextResponse.json({
          success: true,
          message: 'Plan changed and invoice paid',
          debug: {
            invoice_paid: true,
            invoice_id: paidInvoice.id,
            amount: paidInvoice.amount_paid / 100
          }
        })
      } catch (payError: any) {
        console.log('Could not pay invoice:', payError.message)
        
        return NextResponse.json({
          error: 'Payment required',
          payment_url: unpaidInvoice.hosted_invoice_url,
          debug: {
            invoice_id: unpaidInvoice.id,
            amount_due: unpaidInvoice.amount_due / 100,
            payment_error: payError.message
          }
        }, { status: 402 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Debug completed',
      debug: {
        user: user.email,
        current_plan: currentPlan.id,
        new_plan: newPlan.id,
        is_upgrade: isUpgrade,
        subscription_status: updatedSubscription.status,
        invoices: invoices.data.length,
        has_unpaid: !!unpaidInvoice
      }
    })

  } catch (error: any) {
    console.error('=== DEBUG ERROR ===', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
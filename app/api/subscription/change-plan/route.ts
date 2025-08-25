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
    
    // Calculate the actual prices being compared (accounting for billing cycle)
    const currentPrice = subscription.billing_cycle === 'yearly' 
      ? currentPlan.price_yearly 
      : currentPlan.price_monthly
    
    const newPrice = billingCycle === 'yearly' 
      ? newPlan.price_yearly 
      : newPlan.price_monthly
    
    // It's an upgrade if:
    // 1. Moving to a higher tier plan
    // 2. Same plan but switching from monthly to yearly (paying more upfront)
    const isUpgrade = newPlan.price_monthly > currentPlan.price_monthly || 
                     (newPlan.id === currentPlan.id && billingCycle === 'yearly' && subscription.billing_cycle === 'monthly')
    
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
            expand: ['latest_invoice.payment_intent'],
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
          stripeUpdateError.code === 'payment_intent_payment_attempt_failed' ||
          stripeUpdateError.raw?.param === 'payment_behavior') {
        
        // Get the latest invoice to provide payment link
        try {
          const invoices = await stripe.invoices.list({
            subscription: subscription.stripe_subscription_id,
            limit: 1
          })
          
          if (invoices.data.length > 0 && invoices.data[0].status === 'open') {
            const invoice = invoices.data[0]
            
            // Try to finalize and pay the invoice
            if (invoice.id) {
              const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
              
              // Return the payment URL for the customer to complete payment
              return NextResponse.json({
                error: 'Payment required to complete plan upgrade',
                code: 'payment_required',
                payment_url: finalizedInvoice.hosted_invoice_url,
                invoice_id: finalizedInvoice.id
              }, { status: 402 })
            }
          }
        } catch (invoiceError) {
          console.error('Could not retrieve invoice:', invoiceError)
        }
        
        return NextResponse.json({
          error: 'Payment method issue. Please update your payment method and try again.',
          code: 'payment_required'
        }, { status: 400 })
      }
      
      // Re-throw for general error handling
      throw stripeUpdateError
    }
    
    // ALWAYS check for incomplete payment on upgrades
    if (isUpgrade && (updatedSubscription as any).latest_invoice) {
      // latest_invoice can be either a string ID or an expanded invoice object
      const invoiceId = typeof (updatedSubscription as any).latest_invoice === 'string' 
        ? (updatedSubscription as any).latest_invoice 
        : (updatedSubscription as any).latest_invoice.id
      
      const latestInvoice = await stripe.invoices.retrieve(invoiceId)
      
      console.log('Latest invoice status:', latestInvoice.status, 'Amount due:', latestInvoice.amount_due)
      
      // Check if payment is needed
      if (latestInvoice.status === 'open' || latestInvoice.status === 'draft' || 
          (latestInvoice.status === 'paid' && latestInvoice.amount_due === 0 && latestInvoice.amount_paid === 0)) {
        
        // For $0 invoices (shouldn't happen with upgrades but just in case)
        if (latestInvoice.amount_due === 0) {
          console.log('Invoice has $0 due, likely a configuration issue')
        } else {
          // Try to pay the invoice
          try {
            if (latestInvoice.id && latestInvoice.status !== 'paid') {
              const paidInvoice = await stripe.invoices.pay(latestInvoice.id)
              console.log('Invoice paid successfully:', paidInvoice.id)
              
              // Sync after successful payment
              await syncStripeSubscriptionToDatabase(
                subscription.stripe_subscription_id,
                user.id
              )
            }
          } catch (payError: any) {
            console.log('Could not automatically pay invoice:', payError.message)
            
            // Always return payment URL for manual payment on upgrades
            return NextResponse.json({
              error: 'Payment required to complete plan upgrade',
              code: 'payment_required',
              payment_url: latestInvoice.hosted_invoice_url,
              invoice_id: latestInvoice.id,
              message: 'Please complete payment to activate your new plan'
            }, { status: 402 })
          }
        }
      }
      
      // Double-check if the subscription is actually active after payment attempt
      const refreshedSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
      if (refreshedSubscription.status === 'incomplete' || refreshedSubscription.status === 'incomplete_expired') {
        // Get the latest invoice for payment
        const invoices = await stripe.invoices.list({
          subscription: subscription.stripe_subscription_id,
          limit: 1
        })
        
        if (invoices.data.length > 0 && invoices.data[0].hosted_invoice_url) {
          return NextResponse.json({
            error: 'Payment required to activate your new plan',
            code: 'payment_required',
            payment_url: invoices.data[0].hosted_invoice_url,
            invoice_id: invoices.data[0].id,
            message: 'Your plan upgrade requires payment'
          }, { status: 402 })
        }
      }
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
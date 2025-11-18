import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { SUBSCRIPTION_PLANS, PlanId, BillingCycle } from '@/lib/subscription/plans'
import { syncStripeSubscriptionToDatabase } from '@/lib/subscription/sync'
import { queuePlanDowngradedEmail } from '@/lib/email/send'
import { validateStripeKeys } from '@/lib/stripe/validation'

// Validate Stripe keys on module load
validateStripeKeys()

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

    // Get the Stripe subscription with expanded price data
    console.log('Retrieving Stripe subscription:', subscription.stripe_subscription_id)
    
    let stripeSubscription: Stripe.Subscription
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id,
        {
          expand: ['items.data.price']
        }
      )
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
    const newPriceId = billingCycle === 'yearly'
      ? newPlan.stripe_price_id_yearly
      : newPlan.stripe_price_id_monthly

    if (!newPriceId) {
      console.error('Missing Stripe price ID for plan:', newPlanId, 'billing cycle:', billingCycle)
      return NextResponse.json(
        {
          error: 'Configuration error: Stripe price ID not configured for this plan',
          details: 'Please contact support or check your environment variables'
        },
        { status: 500 }
      )
    }

    // Get the current subscription item
    const currentItem = stripeSubscription.items.data[0]
    if (!currentItem) {
      return NextResponse.json({ error: 'No subscription items found' }, { status: 400 })
    }
    
    // Ensure we have the price data
    if (!currentItem.price) {
      console.error('Price data not available on subscription item')
      return NextResponse.json({ 
        error: 'Unable to retrieve current price information',
        details: 'Price data not expanded on subscription item'
      }, { status: 500 })
    }
    
    const currentPriceId = typeof currentItem.price === 'string' ? currentItem.price : currentItem.price.id
    console.log('Current price ID:', currentPriceId)

    // Determine proration behavior
    const currentPlan = SUBSCRIPTION_PLANS[subscription.plan_id as PlanId]
    
    // Calculate the actual prices being compared (accounting for billing cycle)
    const currentPrice = subscription.billing_cycle === 'yearly' 
      ? currentPlan.price_yearly 
      : currentPlan.price_monthly
    
    const newPrice = billingCycle === 'yearly' 
      ? newPlan.price_yearly 
      : newPlan.price_monthly
    
    // Determine if this is an upgrade or downgrade based on plan hierarchy
    // Plan hierarchy: free < starter < professional < enterprise
    const planHierarchy: Record<string, number> = {
      'free': 0,
      'starter': 1,
      'professional': 2,
      'enterprise': 3
    }
    
    const currentTier = planHierarchy[subscription.plan_id] || 0
    const newTier = planHierarchy[newPlanId] || 0
    
    // It's a downgrade if moving to a lower tier
    const isDowngrade = newTier < currentTier
    
    // It's an upgrade if moving to a higher tier OR switching to yearly billing
    const isUpgrade = newTier > currentTier || 
                     (newTier === currentTier && billingCycle === 'yearly' && subscription.billing_cycle === 'monthly')
    
    console.log('Plan change analysis:', {
      current: `${subscription.plan_id} (${subscription.billing_cycle})`,
      new: `${newPlanId} (${billingCycle})`,
      isUpgrade,
      isDowngrade,
      currentTier,
      newTier
    })

    // Initialize Supabase admin client early (needed for log entry)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // IMPORTANT: Create subscription_change_log BEFORE calling Stripe
    // This ensures webhooks that fire during Stripe processing find the correct log entry
    console.log(`Recording ${isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'change'} in subscription_change_log BEFORE Stripe call`)
    await supabaseAdmin
      .from('subscription_change_log')
      .insert({
        user_id: user.id,
        old_subscription_id: subscription.stripe_subscription_id,
        new_subscription_id: subscription.stripe_subscription_id, // Same subscription, plan changed
        old_plan_id: subscription.plan_id,
        new_plan_id: newPlanId,
        change_type: isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'billing_change',
        change_reason: `User-initiated plan ${isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'change'} via billing page`,
        metadata: {
          old_billing_cycle: subscription.billing_cycle,
          new_billing_cycle: billingCycle,
          old_price: currentPrice,
          new_price: newPrice,
          scheduled_for: isDowngrade ? subscription.current_period_end : null
        }
      })

    // Update the subscription
    let updatedSubscription: any
    let scheduledChange: any = null

    try {
      if (isDowngrade) {
        console.log('Processing downgrade - scheduling for period end using Stripe Subscription Schedules')

        // For downgrades, create a Stripe Subscription Schedule
        // This properly schedules the downgrade in Stripe, not just in our database
        // The schedule will have two phases:
        // Phase 1: Current plan until period end
        // Phase 2: New (downgraded) plan starting at period end

        try {
          // Create subscription schedule from existing subscription
          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: subscription.stripe_subscription_id,
          })

          console.log('Created subscription schedule:', schedule.id)

          // Now update the schedule to add the downgrade phase
          const updatedSchedule = await stripe.subscriptionSchedules.update(
            schedule.id,
            {
              end_behavior: 'release', // Release subscription back to normal billing after schedule completes
              phases: [
                {
                  // Phase 1: Keep current plan until period end
                  items: [{
                    price: currentPriceId,
                    quantity: 1,
                  }],
                  start_date: schedule.phases[0].start_date,
                  end_date: (stripeSubscription as any).current_period_end,
                },
                {
                  // Phase 2: Switch to new (downgraded) plan at period end
                  items: [{
                    price: newPriceId,
                    quantity: 1,
                  }],
                  // Stripe will automatically start this phase when phase 1 ends
                }
              ],
            }
          )

          console.log('Subscription schedule updated with downgrade phases:', updatedSchedule.id)

          // Keep the subscription object for database sync
          updatedSubscription = stripeSubscription

          // Track this as a scheduled change in our system
          scheduledChange = {
            type: 'downgrade',
            from_plan: subscription.plan_id,
            to_plan: newPlanId,
            from_cycle: subscription.billing_cycle,
            to_cycle: billingCycle,
            effective_date: subscription.current_period_end,
            new_price_id: newPriceId,
            schedule_id: updatedSchedule.id
          }

          console.log('Downgrade scheduled in Stripe - will take effect at:', new Date((stripeSubscription as any).current_period_end * 1000))

        } catch (scheduleError: any) {
          console.error('Failed to create subscription schedule:', scheduleError)
          throw new Error(`Failed to schedule downgrade: ${scheduleError.message}`)
        }

      } else {
        console.log('Processing upgrade or lateral change - applying immediately')
        
        // First, cancel any existing scheduled changes
        try {
          const schedules = await stripe.subscriptionSchedules.list({
            customer: subscription.stripe_customer_id,
            limit: 1
          })
          
          if (schedules.data.length > 0 && schedules.data[0].status === 'active') {
            console.log('Canceling scheduled downgrade before upgrade:', schedules.data[0].id)
            await stripe.subscriptionSchedules.cancel(schedules.data[0].id)
          }
        } catch (err) {
          console.log('No scheduled changes to cancel')
        }
        
        // Apply upgrade immediately
        updatedSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            items: [{
              id: currentItem.id,
              price: newPriceId,
            }],
            // For upgrades, charge immediately with proration
            proration_behavior: 'always_invoice',
            // End any trial immediately when changing plans
            trial_end: 'now',
            // Set payment behavior to charge immediately
            payment_behavior: 'default_incomplete',
            billing_cycle_anchor: 'now',
            expand: ['latest_invoice.payment_intent'],
            metadata: {
              user_id: user.id,
              plan_id: newPlanId,
              billing_cycle: billingCycle,
            },
          }
        )
      }
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

    if (isDowngrade) {
      // For downgrades, track the Stripe schedule in our database
      console.log('Tracking scheduled downgrade in database...')

      // Keep current plan active, but track the scheduled change
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          // Keep current plan as active (don't change these!)
          plan_id: subscription.plan_id,
          billing_cycle: subscription.billing_cycle,
          // Track the scheduled downgrade
          scheduled_plan_id: newPlanId,
          scheduled_billing_cycle: billingCycle,
          scheduled_change_date: subscription.current_period_end,
          scheduled_stripe_price_id: scheduledChange.new_price_id,
          stripe_schedule_id: scheduledChange.schedule_id, // Store Stripe schedule ID for cancellation
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      console.log('Downgrade scheduled - user keeps current plan until:', subscription.current_period_end)
      console.log('Stripe schedule ID:', scheduledChange.schedule_id)

      // Queue downgrade email immediately since no webhook will fire for downgrades
      console.log('Queueing downgrade email...')
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user.id)
        if (userData?.user?.email) {
          const userName = userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'there'
          const effectiveDate = new Date(subscription.current_period_end)

          await queuePlanDowngradedEmail(
            user.id,
            userData.user.email,
            userName,
            currentPlan.name,
            newPlan.name,
            effectiveDate,
            subscription.stripe_subscription_id
          )
          console.log('Downgrade email queued successfully to:', userData.user.email)
        } else {
          console.error('Could not find user email for downgrade notification')
        }
      } catch (emailError) {
        console.error('Error queueing downgrade email:', emailError)
        // Don't fail the entire request if email fails
      }

    } else {
      // For upgrades, sync immediately
      console.log('Syncing upgraded subscription to database...')
      
      // Clear any scheduled changes since upgrade is immediate
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_id: newPlanId,
          billing_cycle: billingCycle,
          scheduled_plan_id: null,
          scheduled_billing_cycle: null,
          scheduled_change_date: null,
          stripe_schedule_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
      
      console.log('Upgrade applied immediately')
    }

    // Record the plan change in payment history
    const changeDescription = isDowngrade
      ? `Scheduled downgrade to ${newPlan.name} plan (${billingCycle}) - effective ${new Date(subscription.current_period_end).toLocaleDateString()}`
      : isUpgrade 
        ? `Upgraded to ${newPlan.name} plan (${billingCycle})` 
        : `Changed to ${newPlan.name} plan (${billingCycle})`
    
    await supabase
      .from('payment_history')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        amount: 0, // Actual charge will be recorded by webhook
        currency: 'usd',
        status: isDowngrade ? 'scheduled' : 'pending',
        description: changeDescription,
        metadata: { 
          type: isDowngrade ? 'scheduled_downgrade' : 'plan_change', 
          old_plan: subscription.plan_id,
          new_plan: newPlanId,
          billing_cycle: billingCycle,
          scheduled_for: isDowngrade ? subscription.current_period_end : null
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: isDowngrade 
        ? `Downgrade scheduled successfully. You'll keep your ${currentPlan.name} benefits until ${new Date(subscription.current_period_end).toLocaleDateString()}, then automatically switch to ${newPlan.name}.`
        : isUpgrade
          ? 'Plan upgraded successfully. You now have immediate access to additional features.'
          : 'Plan changed successfully.',
      subscription: updatedSubscription,
      scheduled: isDowngrade ? {
        current_plan: subscription.plan_id,
        new_plan: newPlanId,
        effective_date: subscription.current_period_end,
        keeping_benefits_until: subscription.current_period_end
      } : null
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
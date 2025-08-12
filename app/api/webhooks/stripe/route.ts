import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PlanId, BillingCycle } from '@/lib/subscription/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

// Create Supabase client with service role for webhook updates
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

export async function POST(request: NextRequest) {
  console.log('=== Webhook received ===')
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!
  
  console.log('Webhook signature present:', !!signature)

  let event: Stripe.Event

  // Try to verify with production secret first, then local secret
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_LOCAL
  ].filter(Boolean)

  let verified = false
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret!)
      console.log('✅ Webhook verified! Event type:', event.type)
      verified = true
      break
    } catch (err) {
      // Try next secret
      continue
    }
  }

  if (!verified) {
    console.error('❌ Webhook signature verification failed with all secrets')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event!.type) {
      case 'checkout.session.completed': {
        const session = event!.data.object as Stripe.Checkout.Session
        const { user_id, plan_id, billing_cycle } = session.metadata!
        
        console.log('Processing checkout.session.completed:', { user_id, plan_id, billing_cycle })
        
        if (session.subscription) {
          const subscriptionId = typeof session.subscription === 'string' 
            ? session.subscription 
            : (session.subscription as any).id
          
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
          // Handle the Response wrapper if present
          const subscription = 'current_period_end' in subscriptionResponse 
            ? subscriptionResponse 
            : (subscriptionResponse as any).data || subscriptionResponse
          
          const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
          const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
          const trialEnd = (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null
          
          console.log('Subscription dates:', {
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
            trial_end: trialEnd?.toISOString(),
            status: (subscription as any).status
          })
          
          // Create or update subscription in database
          const { data, error } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id,
              plan_id,
              subscription_status: (subscription as any).status, // Use the actual Stripe status
              billing_cycle,
              stripe_subscription_id: (subscription as any).id,
              stripe_customer_id: session.customer as string,
              current_period_start: currentPeriodStart.toISOString(),
              current_period_end: currentPeriodEnd.toISOString(),
              trial_end: trialEnd?.toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            })
            .select()
            .single()
            
          if (error) {
            console.error('Error updating subscription:', error)
            throw error
          }
          
          console.log('Subscription updated successfully:', data)
          
          // If this is a trial, add a trial entry to payment history
          if ((subscription as any).status === 'trialing') {
            const { error: historyError } = await supabaseAdmin
              .from('payment_history')
              .insert({
                user_id,
                subscription_id: data?.id,
                amount: 0,
                currency: 'usd',
                status: 'succeeded',
                description: `Started 7-day free trial for ${plan_id.charAt(0).toUpperCase() + plan_id.slice(1)} plan`,
                metadata: { type: 'trial_started', plan_id },
                created_at: new Date().toISOString()
              })
            
            if (historyError) {
              console.error('Error recording trial start:', historyError)
              // Don't throw, this is not critical
            } else {
              console.log('Trial start recorded in payment history')
            }
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event!.data.object as any // Type assertion to avoid strict typing issues
        const { user_id, plan_id, billing_cycle } = subscription.metadata
        
        console.log('Processing customer.subscription.updated:', { user_id, status: subscription.status })
        
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            subscription_status: subscription.status, // Use subscription_status field
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
          
        if (error) {
          console.error('Error updating subscription:', error)
          throw error
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event!.data.object as any // Type assertion to avoid strict typing issues
        const { user_id } = subscription.metadata
        
        console.log('Processing customer.subscription.deleted:', { user_id })
        
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            subscription_status: 'canceled', // Use subscription_status field
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
          
        if (error) {
          console.error('Error canceling subscription:', error)
          throw error
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event!.data.object as any // Type assertion to avoid strict typing issues
        
        if (invoice.subscription) {
          const subscriptionResponse = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          const subscription = subscriptionResponse as any
          
          console.log('Processing invoice.payment_succeeded:', { 
            user_id: subscription.metadata?.user_id,
            amount: invoice.amount_paid 
          })
          
          // Get or create subscription ID for linking
          const { data: userSub } = await supabaseAdmin
            .from('user_subscriptions')
            .select('id')
            .eq('user_id', subscription.metadata?.user_id)
            .single()
          
          // Record payment in database
          const { error } = await supabaseAdmin
            .from('payment_history')
            .insert({
              user_id: subscription.metadata?.user_id,
              subscription_id: userSub?.id,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              status: 'succeeded',
              stripe_payment_intent_id: invoice.payment_intent as string,
              stripe_invoice_id: invoice.id,
              description: `Payment for ${subscription.metadata?.plan_id || 'subscription'} plan (${subscription.metadata?.billing_cycle || 'recurring'})`,
              metadata: {
                invoice_number: invoice.number,
                billing_reason: invoice.billing_reason,
                plan_id: subscription.metadata?.plan_id,
                billing_cycle: subscription.metadata?.billing_cycle
              },
              created_at: new Date().toISOString()
            })
            
          if (error) {
            console.error('Error recording payment:', error)
            // Don't throw here, payment already succeeded
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
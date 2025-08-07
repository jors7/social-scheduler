import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PlanId, BillingCycle } from '@/lib/subscription/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
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
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { user_id, plan_id, billing_cycle } = session.metadata!
        
        console.log('Processing checkout.session.completed:', { user_id, plan_id, billing_cycle })
        
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
          const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
          
          // Create or update subscription in database
          const { data, error } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id,
              plan_id,
              status: subscription.status === 'trialing' ? 'trialing' : 'active',
              billing_cycle,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: session.customer as string,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
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
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const { user_id, plan_id, billing_cycle } = subscription.metadata
        
        console.log('Processing customer.subscription.updated:', { user_id, status: subscription.status })
        
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: subscription.status,
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
        const subscription = event.data.object as Stripe.Subscription
        const { user_id } = subscription.metadata
        
        console.log('Processing customer.subscription.deleted:', { user_id })
        
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: 'canceled',
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
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          
          console.log('Processing invoice.payment_succeeded:', { 
            user_id: subscription.metadata.user_id,
            amount: invoice.amount_paid 
          })
          
          // Record payment in database
          const { error } = await supabaseAdmin
            .from('payment_history')
            .insert({
              user_id: subscription.metadata.user_id,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              status: 'succeeded',
              stripe_payment_intent_id: invoice.payment_intent as string,
              stripe_invoice_id: invoice.id,
              description: `Payment for ${subscription.metadata.plan_id} plan`,
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
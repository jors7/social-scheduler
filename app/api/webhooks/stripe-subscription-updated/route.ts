import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

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

// This webhook specifically handles when a downgraded subscription enters a new period
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!
    
    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    
    // Handle subscription updated events
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      const previousAttributes = event.data.previous_attributes as any
      
      // Check if this is a period transition (new billing cycle started)
      if (previousAttributes?.current_period_start || previousAttributes?.current_period_end) {
        console.log('Subscription entered new period:', subscription.id)
        
        // Get the user ID from metadata
        const userId = subscription.metadata?.user_id
        if (!userId) {
          console.log('No user_id in subscription metadata')
          return NextResponse.json({ received: true })
        }
        
        // Check if there was a scheduled downgrade
        const { data: dbSub } = await supabaseAdmin
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (dbSub?.scheduled_plan_id && dbSub?.scheduled_stripe_price_id) {
          console.log('Processing scheduled downgrade for user:', userId)
          
          // Now apply the downgrade in Stripe
          try {
            const updatedSub = await stripe.subscriptions.update(
              subscription.id,
              {
                items: [{
                  id: subscription.items.data[0].id,
                  price: dbSub.scheduled_stripe_price_id,
                }],
                proration_behavior: 'none',
              }
            )
            
            console.log('Stripe subscription updated with downgrade')
            
            // Apply the scheduled changes in database
            await supabaseAdmin
              .from('user_subscriptions')
              .update({
                plan_id: dbSub.scheduled_plan_id,
                billing_cycle: dbSub.scheduled_billing_cycle,
                stripe_price_id: dbSub.scheduled_stripe_price_id,
                scheduled_plan_id: null,
                scheduled_billing_cycle: null,
                scheduled_change_date: null,
                scheduled_stripe_price_id: null,
                current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
                current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
            
            console.log('Scheduled downgrade applied successfully')
          } catch (stripeError) {
            console.error('Failed to apply downgrade in Stripe:', stripeError)
          }
        }
      }
    }
    
    return NextResponse.json({ received: true })
    
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
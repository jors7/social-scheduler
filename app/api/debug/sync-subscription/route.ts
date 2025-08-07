import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    // Create admin client
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

    // Find customer in Stripe
    const customers = await stripe.customers.list({
      email,
      limit: 1
    })

    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
    }

    const customer = customers.data[0]

    // Get their subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 1
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 404 })
    }

    const subscription = subscriptions.data[0]

    // Extract metadata
    const { user_id, plan_id, billing_cycle } = subscription.metadata

    if (!user_id || !plan_id) {
      return NextResponse.json({ error: 'Missing metadata in subscription' }, { status: 400 })
    }

    // Convert timestamps safely
    const currentPeriodStart = typeof subscription.current_period_start === 'number' 
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : new Date().toISOString()
    
    const currentPeriodEnd = typeof subscription.current_period_end === 'number'
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Update or create subscription in database
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id,
        plan_id,
        status: subscription.status as any,
        billing_cycle: billing_cycle || 'monthly',
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customer.id,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_end: subscription.trial_end && typeof subscription.trial_end === 'number' 
          ? new Date(subscription.trial_end * 1000).toISOString() 
          : null,
        cancel_at: subscription.cancel_at && typeof subscription.cancel_at === 'number'
          ? new Date(subscription.cancel_at * 1000).toISOString() 
          : null,
        canceled_at: subscription.canceled_at && typeof subscription.canceled_at === 'number'
          ? new Date(subscription.canceled_at * 1000).toISOString() 
          : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
      
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to sync subscription',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      subscription: data,
      stripe_subscription: subscription
    })

  } catch (error) {
    console.error('Sync subscription error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
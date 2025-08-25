import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { syncStripeSubscriptionToDatabase } from '@/lib/subscription/sync'

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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Force syncing subscription for:', user.email)

    // Get user's subscription from database
    const { data: dbSub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!dbSub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription found' })
    }

    // Get the Stripe subscription
    const subscription = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id, {
      expand: ['items.data.price']
    })

    // Determine the plan from the price
    const currentItem = subscription.items.data[0]
    const currentPrice = currentItem.price
    const priceId = currentPrice.id
    
    let planId = 'professional' // default
    let billingCycle = 'monthly'
    
    // Check against known price IDs
    const PRICE_MAPPINGS: Record<string, { plan: string, cycle: string }> = {
      'price_1RtUNnA6BBN8qFjBGLuo3qFM': { plan: 'starter', cycle: 'monthly' },
      'price_1RtUNSA6BBN8qFjBoeFyL3NS': { plan: 'starter', cycle: 'yearly' },
      'price_1RtUOEA6BBN8qFjB0HtMVjLr': { plan: 'professional', cycle: 'monthly' },
      'price_1RtUOTA6BBN8qFjBrXkY1ExC': { plan: 'professional', cycle: 'yearly' },
      'price_1RtUP4A6BBN8qFjBI2hBmwcT': { plan: 'enterprise', cycle: 'monthly' },
      'price_1RtUPFA6BBN8qFjByzefry7H': { plan: 'enterprise', cycle: 'yearly' },
    }
    
    if (PRICE_MAPPINGS[priceId]) {
      planId = PRICE_MAPPINGS[priceId].plan
      billingCycle = PRICE_MAPPINGS[priceId].cycle
    } else {
      // Fallback to amount-based detection
      const amount = (currentPrice.unit_amount || 0) / 100
      const interval = currentPrice.recurring?.interval
      
      if (interval === 'month') {
        if (amount === 9) planId = 'starter'
        else if (amount === 19) planId = 'professional'
        else if (amount === 29) planId = 'enterprise'
        billingCycle = 'monthly'
      } else if (interval === 'year') {
        if (amount === 90) planId = 'starter'
        else if (amount === 190) planId = 'professional'
        else if (amount === 290) planId = 'enterprise'
        billingCycle = 'yearly'
      }
    }

    console.log('Detected plan from Stripe:', {
      price_id: priceId,
      plan: planId,
      billing_cycle: billingCycle,
      amount: (currentPrice.unit_amount || 0) / 100
    })

    // Force update the database - first check if record exists
    const { data: existingRecord } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!existingRecord) {
      // Create new record if it doesn't exist
      const { error: insertError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle,
          status: subscription.status,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
          stripe_price_id: priceId,
          current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Database insert error:', insertError)
        return NextResponse.json({ 
          error: 'Failed to insert into database', 
          details: insertError 
        }, { status: 500 })
      }
    } else {
      // Update existing record
      const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_id: planId,
          billing_cycle: billingCycle,
          status: subscription.status,
          stripe_price_id: priceId,
          current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()

      if (updateError) {
        console.error('Database update error:', updateError)
        console.error('Update details:', {
          user_id: user.id,
          plan_id: planId,
          existing_record: existingRecord
        })
        
        // Try alternate update using ID
        if (existingRecord.id) {
          const { error: altUpdateError } = await supabaseAdmin
            .from('user_subscriptions')
            .update({
              plan_id: planId,
              billing_cycle: billingCycle,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id)

          if (altUpdateError) {
            return NextResponse.json({ 
              error: 'Failed to update database', 
              details: altUpdateError,
              tried_methods: ['user_id update', 'id update']
            }, { status: 500 })
          }
        } else {
          return NextResponse.json({ 
            error: 'Failed to update database', 
            details: updateError 
          }, { status: 500 })
        }
      }

      console.log('Database updated successfully:', updatedData)
    }

    // Also try the sync function
    const syncResult = await syncStripeSubscriptionToDatabase(
      dbSub.stripe_subscription_id,
      user.id
    )

    return NextResponse.json({
      success: true,
      message: 'Subscription force synced successfully',
      details: {
        stripe_plan: planId,
        stripe_billing_cycle: billingCycle,
        stripe_price_id: priceId,
        stripe_amount: (currentPrice.unit_amount || 0) / 100,
        database_updated: true,
        sync_result: syncResult
      }
    })

  } catch (error: any) {
    console.error('Force sync error:', error)
    return NextResponse.json({ 
      error: 'Failed to force sync', 
      details: error.message 
    }, { status: 500 })
  }
}
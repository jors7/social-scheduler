import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
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

    console.log('Fixing billing date for:', user.email)

    // Get user's subscription from database
    const { data: dbSub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!dbSub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription found' })
    }

    // Get the Stripe subscription with expanded price info
    const subscription = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id, {
      expand: ['items.data.price']
    })

    // Detect the actual plan and billing cycle from Stripe
    const currentItem = (subscription as any).items.data[0]
    const currentPrice = currentItem?.price
    const priceId = currentPrice?.id
    
    let detectedPlanId = dbSub.plan_id // fallback to current
    let detectedBillingCycle = dbSub.billing_cycle // fallback to current
    
    if (priceId) {
      // Known price ID mappings
      const PRICE_MAPPINGS: Record<string, { plan: string, cycle: string }> = {
        'price_1RtUNnA6BBN8qFjBGLuo3qFM': { plan: 'starter', cycle: 'monthly' },
        'price_1RtUNSA6BBN8qFjBoeFyL3NS': { plan: 'starter', cycle: 'yearly' },
        'price_1RtUOEA6BBN8qFjB0HtMVjLr': { plan: 'professional', cycle: 'monthly' },
        'price_1RtUOTA6BBN8qFjBrXkY1ExC': { plan: 'professional', cycle: 'yearly' },
        'price_1RtUP4A6BBN8qFjBI2hBmwcT': { plan: 'enterprise', cycle: 'monthly' },
        'price_1RtUPFA6BBN8qFjByzefry7H': { plan: 'enterprise', cycle: 'yearly' },
        // Dynamically created prices
        'price_1RzxEiA6BBN8qFjBnq7oVQYu': { plan: 'enterprise', cycle: 'monthly' },
        'price_1RzxMlA6BBN8qFjBC1uVrD7K': { plan: 'enterprise', cycle: 'yearly' },
        'price_1S02IuA6BBN8qFjBVzAzPdtR': { plan: 'enterprise', cycle: 'yearly' },
      }
      
      if (PRICE_MAPPINGS[priceId]) {
        detectedPlanId = PRICE_MAPPINGS[priceId].plan
        detectedBillingCycle = PRICE_MAPPINGS[priceId].cycle
      } else {
        // Fallback to amount-based detection
        const amount = (currentPrice.unit_amount || 0) / 100
        const interval = currentPrice.recurring?.interval
        
        if (interval === 'month') {
          if (amount === 9) detectedPlanId = 'starter'
          else if (amount === 19) detectedPlanId = 'professional'
          else if (amount === 29) detectedPlanId = 'enterprise'
          detectedBillingCycle = 'monthly'
        } else if (interval === 'year') {
          if (amount === 90) detectedPlanId = 'starter'
          else if (amount === 190) detectedPlanId = 'professional'
          else if (amount === 290) detectedPlanId = 'enterprise'
          detectedBillingCycle = 'yearly'
        }
      }
    }

    console.log('Stripe subscription details:', {
      price_id: priceId,
      detected_plan: detectedPlanId,
      detected_cycle: detectedBillingCycle,
      period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      status: subscription.status
    })

    console.log('Database details:', {
      current_plan: dbSub.plan_id,
      current_cycle: dbSub.billing_cycle,
      period_start: dbSub.current_period_start,
      period_end: dbSub.current_period_end
    })

    // Force update ALL subscription fields from Stripe
    const updateData = {
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      status: subscription.status,
      plan_id: detectedPlanId,
      billing_cycle: detectedBillingCycle,
      stripe_price_id: priceId,
      updated_at: new Date().toISOString()
    }

    console.log('Updating with data:', updateData)

    // Use upsert to ensure the update happens
    const { data: upsertResult, error: upsertError } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert(
        {
          user_id: user.id,
          plan_id: detectedPlanId,
          billing_cycle: detectedBillingCycle,
          status: subscription.status,
          stripe_subscription_id: dbSub.stripe_subscription_id,
          stripe_customer_id: dbSub.stripe_customer_id,
          stripe_price_id: priceId || dbSub.stripe_price_id,
          current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          trial_end: dbSub.trial_end,
          cancel_at: subscription.cancel_at ? new Date((subscription as any).cancel_at * 1000).toISOString() : null,
          canceled_at: subscription.canceled_at ? new Date((subscription as any).canceled_at * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('Upsert failed:', upsertError)
      return NextResponse.json({ 
        error: 'Failed to fix billing date',
        details: upsertError.message
      }, { status: 500 })
    }

    console.log('Successfully upserted subscription with correct dates:', upsertResult)

    // Verify the update by fetching fresh data
    const { data: verifyData } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const stripePeriodEnd = new Date((subscription as any).current_period_end * 1000).toISOString()
    const dbPeriodEnd = verifyData?.current_period_end
    const matches = dbPeriodEnd === stripePeriodEnd

    console.log('Verification:', {
      stripe_end: stripePeriodEnd,
      db_end: dbPeriodEnd,
      matches: matches
    })

    // If still not matching, try one more direct update
    if (!matches && verifyData) {
      console.log('Dates still not matching, trying direct update without upsert')
      
      const { data: directUpdate, error: directError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_id: detectedPlanId,
          billing_cycle: detectedBillingCycle,
          stripe_price_id: priceId,
          current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('stripe_subscription_id', dbSub.stripe_subscription_id)
        .select()
        .single()

      if (!directError) {
        console.log('Direct update succeeded:', directUpdate)
      } else {
        console.error('Direct update failed:', directError)
      }
    }

    // Final verification
    const { data: finalData } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Billing date fix completed',
      stripe_dates: {
        period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
        period_end: stripePeriodEnd,
      },
      database_dates: {
        period_start: finalData?.current_period_start,
        period_end: finalData?.current_period_end,
      },
      matches: finalData?.current_period_end === stripePeriodEnd,
      subscription_details: {
        old_plan: dbSub.plan_id,
        new_plan: finalData?.plan_id || detectedPlanId,
        old_cycle: dbSub.billing_cycle,
        new_cycle: finalData?.billing_cycle || detectedBillingCycle,
        status: subscription.status,
        price_id: priceId
      }
    })

  } catch (error: any) {
    console.error('Fix billing date error:', error)
    return NextResponse.json({ 
      error: 'Failed to fix billing date', 
      details: error.message 
    }, { status: 500 })
  }
}
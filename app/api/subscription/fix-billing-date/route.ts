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

    // Get the Stripe subscription
    const subscription = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id)

    console.log('Stripe subscription period:', {
      start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      status: subscription.status
    })

    console.log('Database period:', {
      start: dbSub.current_period_start,
      end: dbSub.current_period_end,
      billing_cycle: dbSub.billing_cycle
    })

    // Force update ALL subscription fields from Stripe
    const updateData = {
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      status: subscription.status,
      billing_cycle: dbSub.billing_cycle, // Keep the existing billing cycle
      updated_at: new Date().toISOString()
    }

    console.log('Updating with data:', updateData)

    // Use upsert to ensure the update happens
    const { data: upsertResult, error: upsertError } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert(
        {
          user_id: user.id,
          plan_id: dbSub.plan_id,
          billing_cycle: dbSub.billing_cycle,
          status: subscription.status,
          stripe_subscription_id: dbSub.stripe_subscription_id,
          stripe_customer_id: dbSub.stripe_customer_id,
          stripe_price_id: dbSub.stripe_price_id,
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
        plan: dbSub.plan_id,
        billing_cycle: dbSub.billing_cycle,
        status: subscription.status
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
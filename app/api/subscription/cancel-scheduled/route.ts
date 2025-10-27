import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function POST(request: NextRequest) {
  console.log('=== Cancel Scheduled Change Called ===')
  
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

    // Get user's subscription with scheduled change info
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Check if there's a scheduled change (either with schedule ID or just tracked in DB)
    if (!subscription.scheduled_plan_id) {
      return NextResponse.json({ 
        error: 'No scheduled changes found',
        message: 'There are no scheduled plan changes to cancel'
      }, { status: 400 })
    }

    // If there's a Stripe schedule ID, release it to return subscription to normal billing
    if (subscription.stripe_schedule_id) {
      console.log('Releasing Stripe schedule to cancel downgrade:', subscription.stripe_schedule_id)

      try {
        // Release the schedule immediately to return the subscription to normal billing
        // This removes the schedule and keeps the current plan
        const releasedSchedule = await stripe.subscriptionSchedules.release(
          subscription.stripe_schedule_id
        )

        console.log('Schedule released successfully, subscription returned to normal billing:', releasedSchedule.id)
      } catch (stripeError: any) {
        // If schedule does not exist or already released, that is OK
        if (stripeError.code !== 'resource_missing') {
          throw stripeError
        }
        console.log('Schedule already released/canceled or does not exist')
      }
    } else {
      console.log('No Stripe schedule to cancel, just clearing DB tracking')
    }

    // Clear the scheduled change info from database
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

    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        scheduled_plan_id: null,
        scheduled_billing_cycle: null,
        scheduled_change_date: null,
        scheduled_stripe_price_id: null,
        stripe_schedule_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to clear scheduled change from database:', updateError)
      // Don't fail the request since Stripe cancellation succeeded
    }

    // Record the cancellation in payment history
    await supabase
      .from('payment_history')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        amount: 0,
        currency: 'usd',
        status: 'canceled',
        description: `Canceled scheduled downgrade to ${subscription.scheduled_plan_id}`,
        metadata: { 
          type: 'scheduled_change_canceled',
          canceled_plan: subscription.scheduled_plan_id,
          canceled_cycle: subscription.scheduled_billing_cycle
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Scheduled plan change has been canceled. You will continue with your current plan.',
      current_plan: subscription.plan_id,
      current_cycle: subscription.billing_cycle
    })

  } catch (error: any) {
    console.error('Cancel scheduled change error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to cancel scheduled change',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
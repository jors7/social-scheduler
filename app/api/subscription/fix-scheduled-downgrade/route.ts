import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/plans'

export async function POST(request: NextRequest) {
  console.log('=== Fix Scheduled Downgrade Called ===')
  
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

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    console.log('Current subscription data:', {
      plan_id: subscription.plan_id,
      scheduled_plan_id: subscription.scheduled_plan_id,
      scheduled_billing_cycle: subscription.scheduled_billing_cycle,
      scheduled_change_date: subscription.scheduled_change_date
    })

    // If there's a scheduled downgrade but it got messed up, fix it
    if (subscription.scheduled_plan_id) {
      // Since we're moving away from immediately changing Stripe,
      // we need to ensure the current plan is Enterprise
      // and the scheduled plan is Professional
      
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

      // Fix: Set current plan back to Enterprise, keep Professional as scheduled
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_id: 'enterprise', // Restore to Enterprise
          billing_cycle: 'yearly', // Enterprise Annual
          scheduled_plan_id: 'professional', // Keep Professional scheduled
          scheduled_billing_cycle: 'yearly',
          scheduled_change_date: subscription.current_period_end || subscription.scheduled_change_date,
          // Calculate the price ID for Professional Yearly
          scheduled_stripe_price_id: SUBSCRIPTION_PLANS.professional.stripe_price_id_yearly || 'price_1RtUNzA6BBN8qFjBe5iCg3Gi',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to fix subscription:', updateError)
        return NextResponse.json({ 
          error: 'Failed to fix subscription',
          details: updateError.message 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Fixed scheduled downgrade - You now have Enterprise until period end',
        current_plan: 'enterprise',
        scheduled_plan: 'professional',
        effective_date: subscription.current_period_end || subscription.scheduled_change_date
      })
    } else {
      return NextResponse.json({
        message: 'No scheduled changes to fix',
        current_plan: subscription.plan_id
      })
    }

  } catch (error: any) {
    console.error('Fix scheduled downgrade error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fix scheduled downgrade',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
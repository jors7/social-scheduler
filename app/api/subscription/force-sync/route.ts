import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

const supabaseAdmin = createAdminClient(
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
  console.log('=== Force Sync Subscription ===')
  
  try {
    // Get the current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Syncing for user:', user.email)

    // Get subscription from database
    const { data: dbSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!dbSub || !dbSub.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription to sync' }, { status: 404 })
    }

    // Get the Stripe subscription
    const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id)
    console.log('Stripe subscription:', {
      id: stripeSub.id,
      status: stripeSub.status,
      price_id: stripeSub.items.data[0]?.price.id
    })

    // Determine the plan and billing cycle from the price ID
    let planId = 'starter'
    let billingCycle = 'monthly'
    
    const priceId = stripeSub.items.data[0]?.price.id
    
    // Map price ID to plan and cycle
    if (priceId === process.env.STRIPE_STARTER_MONTHLY_PRICE_ID) {
      planId = 'starter'
      billingCycle = 'monthly'
    } else if (priceId === process.env.STRIPE_STARTER_YEARLY_PRICE_ID) {
      planId = 'starter'
      billingCycle = 'yearly'
    } else if (priceId === process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID) {
      planId = 'professional'
      billingCycle = 'monthly'
    } else if (priceId === process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID) {
      planId = 'professional'
      billingCycle = 'yearly'
    } else if (priceId === process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID) {
      planId = 'enterprise'
      billingCycle = 'monthly'
    } else if (priceId === process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID) {
      planId = 'enterprise'
      billingCycle = 'yearly'
    }

    console.log('Detected plan:', planId, 'cycle:', billingCycle)

    // Update the database with correct information
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        plan_id: planId,
        billing_cycle: billingCycle,
        status: stripeSub.status,
        current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        trial_end: stripeSub.trial_end 
          ? new Date(stripeSub.trial_end * 1000).toISOString() 
          : null,
        cancel_at: stripeSub.cancel_at 
          ? new Date(stripeSub.cancel_at * 1000).toISOString() 
          : null,
        canceled_at: stripeSub.canceled_at 
          ? new Date(stripeSub.canceled_at * 1000).toISOString() 
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    console.log('Subscription synced successfully')

    return NextResponse.json({
      success: true,
      message: 'Subscription synced successfully',
      subscription: updated,
      stripe: {
        status: stripeSub.status,
        price_id: priceId,
        plan: planId,
        cycle: billingCycle
      }
    })
    
  } catch (error: any) {
    console.error('Force sync error:', error)
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error?.message 
    }, { status: 500 })
  }
}
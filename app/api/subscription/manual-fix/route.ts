import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Create Supabase admin client for database updates
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
  console.log('=== Manual Fix Subscription API Called ===')
  
  try {
    // Get the plan details from request body
    const body = await request.json()
    const { planId = 'starter', billingCycle = 'monthly' } = body
    
    console.log('Fix parameters:', { planId, billingCycle })
    
    // Get the current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fixing subscription for user:', user.id, 'Email:', user.email)

    // Calculate period dates
    const now = new Date()
    const periodEnd = new Date()
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    // Create or update subscription in database
    const { data: subscription, error: upsertError } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: planId,
        status: 'active',
        billing_cycle: billingCycle,
        stripe_subscription_id: `manual_${Date.now()}`, // Temporary ID
        stripe_customer_id: `manual_cus_${user.id.substring(0, 8)}`, // Temporary customer ID
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_end: null,
        cancel_at: null,
        canceled_at: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error creating/updating subscription:', upsertError)
      return NextResponse.json({ 
        error: 'Failed to create subscription',
        details: upsertError.message 
      }, { status: 500 })
    }

    console.log('Subscription created/updated successfully:', subscription)

    // Also add a payment history entry
    const { error: paymentError } = await supabaseAdmin
      .from('payment_history')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        amount: 0,
        currency: 'usd',
        status: 'succeeded',
        description: `Manual activation of ${planId} plan (${billingCycle})`,
        metadata: { type: 'manual_activation', plan_id: planId, billing_cycle: billingCycle },
        created_at: now.toISOString()
      })

    if (paymentError) {
      console.error('Error creating payment history:', paymentError)
      // Don't fail the request, payment history is not critical
    }

    return NextResponse.json({ 
      success: true,
      message: 'Subscription manually activated',
      subscription,
      note: 'This is a temporary fix. You should still set up proper Stripe webhook integration.'
    })
    
  } catch (error: any) {
    console.error('=== MANUAL FIX ERROR ===')
    console.error('Error:', error)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
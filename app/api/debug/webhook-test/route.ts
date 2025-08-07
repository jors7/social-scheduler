import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { user_id, plan_id, billing_cycle } = await request.json()
    
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

    // Manually create a subscription (simulating what the webhook should do)
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id,
        plan_id,
        status: 'active',
        billing_cycle,
        stripe_subscription_id: 'test_sub_' + Date.now(),
        stripe_customer_id: 'test_cus_' + Date.now(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
      
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to create subscription',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      subscription: data
    })

  } catch (error) {
    console.error('Webhook test error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
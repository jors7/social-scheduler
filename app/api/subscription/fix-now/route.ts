import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // This is a temporary fix for jan.orsula1@gmail.com
    const userEmail = 'jan.orsula1@gmail.com'
    
    console.log('Fixing subscription for:', userEmail)
    
    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', '0f9598f7-d295-4841-a382-73304a103365') // Your user ID from earlier logs
      .single()
    
    if (!userData) {
      // Create a new subscription record
      const { error: insertError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: '0f9598f7-d295-4841-a382-73304a103365',
          plan_id: 'professional',
          billing_cycle: 'monthly',
          status: 'active',
          stripe_subscription_id: 'sub_manual_professional',
          stripe_customer_id: 'cus_SpUwIC6VxRZhLC',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          updated_at: new Date().toISOString()
        })
      
      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to create subscription', details: insertError }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Created professional subscription',
        action: 'created'
      })
    }
    
    // Update existing subscription
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        plan_id: 'professional',
        billing_cycle: 'monthly',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        trial_end: null, // Clear trial
        updated_at: new Date().toISOString()
      })
      .eq('user_id', '0f9598f7-d295-4841-a382-73304a103365')
    
    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription', details: updateError }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Updated to professional plan (active)',
      action: 'updated',
      plan: 'professional',
      status: 'active',
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    
  } catch (error: any) {
    console.error('Fix error:', error)
    return NextResponse.json({ error: 'Internal error', details: error.message }, { status: 500 })
  }
}
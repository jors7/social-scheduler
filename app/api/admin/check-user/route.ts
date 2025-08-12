import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('id') || '34da8335-3c9d-44b8-a13f-b7aff8e3b3d7'
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  
  // Get from user_subscriptions table
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  // Get Stripe subscription if exists - simplified version
  let stripeData = null
  if (subscription?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      // Use fetch directly to avoid type issues
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription.stripe_subscription_id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        }
      })
      
      if (response.ok) {
        const stripeSub = await response.json()
        stripeData = {
          id: stripeSub.id,
          status: stripeSub.status,
          current_period_end: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000).toISOString() : null,
          items: stripeSub.items?.data?.length > 0 ? stripeSub.items.data[0].price : null
        }
      }
    } catch (error) {
      stripeData = { error: 'Failed to fetch Stripe data' }
    }
  }
  
  // Check what plan this should be based on plan_id
  const expectedPlan = subscription?.plan_id || 'free'
  
  return NextResponse.json({
    userId,
    user_subscriptions_table: subscription,
    stripe_data: stripeData,
    expected_plan: expectedPlan,
    columns_in_table: {
      plan_column: subscription?.plan_id ? 'plan_id' : 'subscription_plan',
      status_column: subscription?.status ? 'status' : 'subscription_status',
      trial_column: subscription?.trial_end ? 'trial_end' : 'trial_ends_at'
    }
  })
}
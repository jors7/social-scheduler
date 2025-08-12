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
  
  // Get Stripe subscription if exists
  let stripeData = null
  if (subscription?.stripe_subscription_id) {
    try {
      const Stripe = await import('stripe')
      const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-12-18.acacia'
      })
      
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
      stripeData = {
        id: stripeSub.id,
        status: stripeSub.status,
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        items: stripeSub.items.data.map(item => ({
          price_id: item.price.id,
          product_id: item.price.product,
          interval: item.price.recurring?.interval,
          amount: item.price.unit_amount
        }))
      }
    } catch (error) {
      stripeData = { error: 'Failed to fetch Stripe data' }
    }
  }
  
  // Check what plan this should be based on Stripe
  let expectedPlan = 'free'
  if (stripeData && !('error' in stripeData)) {
    const priceId = stripeData.items[0]?.price_id
    if (priceId) {
      // Map price IDs to plans (you'll need to adjust these based on your actual price IDs)
      if (priceId.includes('starter')) expectedPlan = 'starter'
      else if (priceId.includes('professional')) expectedPlan = 'professional'
      else if (priceId.includes('enterprise')) expectedPlan = 'enterprise'
    }
  }
  
  return NextResponse.json({
    userId,
    user_subscriptions_table: subscription,
    stripe_data: stripeData,
    expected_plan: expectedPlan,
    mismatch: subscription?.subscription_plan !== expectedPlan
  })
}
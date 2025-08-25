import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { SUBSCRIPTION_PLANS, PlanId } from '@/lib/subscription/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

// Map Stripe price IDs to plan IDs
function getPlanFromPrice(priceId: string): { planId: PlanId; billingCycle: 'monthly' | 'yearly' } | null {
  // Hardcoded mappings for all known price IDs
  const KNOWN_PRICES: Record<string, { planId: PlanId; billingCycle: 'monthly' | 'yearly' }> = {
    // Original price IDs
    'price_1RtUNnA6BBN8qFjBGLuo3qFM': { planId: 'starter', billingCycle: 'monthly' },
    'price_1RtUNSA6BBN8qFjBoeFyL3NS': { planId: 'starter', billingCycle: 'yearly' },
    'price_1RtUOEA6BBN8qFjB0HtMVjLr': { planId: 'professional', billingCycle: 'monthly' },
    'price_1RtUOTA6BBN8qFjBrXkY1ExC': { planId: 'professional', billingCycle: 'yearly' },
    'price_1RtUP4A6BBN8qFjBI2hBmwcT': { planId: 'enterprise', billingCycle: 'monthly' },
    'price_1RtUPFA6BBN8qFjByzefry7H': { planId: 'enterprise', billingCycle: 'yearly' },
    // Dynamically created price IDs (from buggy upgrades)
    'price_1RzxEiA6BBN8qFjBnq7oVQYu': { planId: 'enterprise', billingCycle: 'monthly' },
    'price_1RzxMlA6BBN8qFjBC1uVrD7K': { planId: 'enterprise', billingCycle: 'yearly' },
    'price_1S02IuA6BBN8qFjBVzAzPdtR': { planId: 'enterprise', billingCycle: 'yearly' },
  }
  
  if (KNOWN_PRICES[priceId]) {
    return KNOWN_PRICES[priceId]
  }
  
  // Check all plans for matching price IDs
  for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.stripe_price_id_monthly === priceId) {
      return { planId: planId as PlanId, billingCycle: 'monthly' }
    }
    if (plan.stripe_price_id_yearly === priceId) {
      return { planId: planId as PlanId, billingCycle: 'yearly' }
    }
  }
  
  // Fallback: check by price amount
  return null
}

function getPlanFromAmount(amount: number, interval: string): { planId: PlanId; billingCycle: 'monthly' | 'yearly' } {
  const billingCycle = interval === 'year' ? 'yearly' : 'monthly'
  
  // Amount is already in cents, compare directly with plan prices (also in cents)
  // Match by price
  for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (billingCycle === 'monthly' && plan.price_monthly === amount) {
      return { planId: planId as PlanId, billingCycle }
    }
    if (billingCycle === 'yearly' && plan.price_yearly === amount) {
      return { planId: planId as PlanId, billingCycle }
    }
  }
  
  // Try dollar comparison as fallback (for legacy reasons)
  const priceInDollars = amount / 100
  if (billingCycle === 'monthly') {
    if (priceInDollars === 9) return { planId: 'starter', billingCycle }
    if (priceInDollars === 19) return { planId: 'professional', billingCycle }
    if (priceInDollars === 29) return { planId: 'enterprise', billingCycle }
  } else {
    if (priceInDollars === 90) return { planId: 'starter', billingCycle }
    if (priceInDollars === 190) return { planId: 'professional', billingCycle }
    if (priceInDollars === 290) return { planId: 'enterprise', billingCycle }
  }
  
  // Default to professional if no match
  return { planId: 'professional', billingCycle }
}

export async function POST(request: NextRequest) {
  console.log('=== Force Update Subscription Called ===')
  
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
    
    console.log('Force updating subscription for user:', user.id)

    // Create service role client
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get current subscription from database
    const { data: dbSubscription } = await serviceSupabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!dbSubscription?.stripe_subscription_id) {
      return NextResponse.json({ 
        error: 'No Stripe subscription found',
        message: 'User does not have a Stripe subscription to sync'
      }, { status: 404 })
    }

    // Fetch latest from Stripe
    console.log('Fetching subscription from Stripe:', dbSubscription.stripe_subscription_id)
    const stripeSubscription: any = await stripe.subscriptions.retrieve(dbSubscription.stripe_subscription_id)
    
    // Get the active price from the subscription
    const activeItem = stripeSubscription.items.data[0]
    if (!activeItem) {
      throw new Error('No active subscription items found')
    }
    
    const price = activeItem.price
    console.log('Active price:', price.id, 'Amount:', price.unit_amount, 'Interval:', price.recurring?.interval)
    
    // Determine the plan from the price
    console.log('Attempting to determine plan from price ID:', price.id)
    let planInfo = getPlanFromPrice(price.id)
    
    if (planInfo) {
      console.log('Found plan from price ID mapping:', planInfo)
    } else {
      console.log('No direct price ID match, trying amount-based detection')
      console.log('Price details - Amount:', price.unit_amount, 'Interval:', price.recurring?.interval)
      
      if (price.unit_amount && price.recurring?.interval) {
        planInfo = getPlanFromAmount(price.unit_amount, price.recurring.interval)
        console.log('Determined plan from amount:', planInfo)
      }
    }
    
    if (!planInfo) {
      console.error('Could not determine plan from price:', price.id, 'Amount:', price.unit_amount)
      return NextResponse.json({ 
        error: 'Could not determine plan',
        details: `Unable to map Stripe price ${price.id} (amount: ${price.unit_amount}) to a plan`,
        price_id: price.id,
        amount: price.unit_amount,
        interval: price.recurring?.interval
      }, { status: 500 })
    }
    
    console.log('Final determined plan:', planInfo.planId, 'Billing cycle:', planInfo.billingCycle)
    
    // Force update the database
    const updateData = {
      plan_id: planInfo.planId,
      billing_cycle: planInfo.billingCycle,
      status: stripeSubscription.status,
      stripe_price_id: price.id,
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Updating database with:', updateData)
    
    const { data: updated, error: updateError } = await serviceSupabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      
      // Try upsert as fallback
      const { data: upserted, error: upsertError } = await serviceSupabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          stripe_subscription_id: dbSubscription.stripe_subscription_id,
          stripe_customer_id: dbSubscription.stripe_customer_id || stripeSubscription.customer as string,
          ...updateData
        })
        .select()
        .single()
      
      if (upsertError) {
        throw upsertError
      }
      
      console.log('Successfully upserted subscription')
      return NextResponse.json({
        success: true,
        message: 'Subscription force updated (upsert)',
        subscription: upserted,
        stripe: {
          status: stripeSubscription.status,
          price: price.id,
          amount: price.unit_amount,
          interval: price.recurring?.interval
        }
      })
    }
    
    console.log('Successfully updated subscription')
    
    return NextResponse.json({
      success: true,
      message: 'Subscription force updated successfully',
      subscription: updated,
      stripe: {
        status: stripeSubscription.status,
        price: price.id,
        amount: price.unit_amount,
        interval: price.recurring?.interval
      }
    })

  } catch (error: any) {
    console.error('Force update error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to force update subscription',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
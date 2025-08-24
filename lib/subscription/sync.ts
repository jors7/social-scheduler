import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { PlanId, SUBSCRIPTION_PLANS } from './plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

// Create admin client for server-side operations
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

// Map Stripe price to plan details
function getPlanFromStripePrice(priceId: string, amount?: number | null, interval?: string): { planId: PlanId; billingCycle: 'monthly' | 'yearly' } {
  // First try exact price ID match
  for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.stripe_price_id_monthly === priceId) {
      return { planId: planId as PlanId, billingCycle: 'monthly' }
    }
    if (plan.stripe_price_id_yearly === priceId) {
      return { planId: planId as PlanId, billingCycle: 'yearly' }
    }
  }
  
  // Fallback to amount matching
  if (amount && interval) {
    const priceInDollars = amount / 100
    const isYearly = interval === 'year'
    
    for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (isYearly && plan.price_yearly === priceInDollars) {
        return { planId: planId as PlanId, billingCycle: 'yearly' }
      }
      if (!isYearly && plan.price_monthly === priceInDollars) {
        return { planId: planId as PlanId, billingCycle: 'monthly' }
      }
    }
  }
  
  // Default fallback
  console.warn(`Could not match Stripe price ${priceId} to a plan, defaulting to starter`)
  return { planId: 'starter', billingCycle: 'monthly' }
}

// Sync a Stripe subscription to the database
export async function syncStripeSubscriptionToDatabase(
  stripeSubscriptionId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Syncing Stripe subscription ${stripeSubscriptionId} to database`)
    
    // Fetch subscription from Stripe
    const subscription: any = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data.price', 'customer']
    })
    
    // Get user ID from metadata or parameter
    const userIdToUse = userId || subscription.metadata?.user_id
    if (!userIdToUse) {
      console.error('No user ID found for subscription')
      return { success: false, error: 'No user ID found' }
    }
    
    // Get the active price item
    const activeItem = subscription.items.data[0]
    if (!activeItem) {
      console.error('No active items in subscription')
      return { success: false, error: 'No active subscription items' }
    }
    
    const price = activeItem.price
    const { planId, billingCycle } = getPlanFromStripePrice(
      price.id,
      price.unit_amount,
      price.recurring?.interval
    )
    
    console.log(`Determined plan: ${planId} (${billingCycle})`)
    
    // Prepare subscription data
    const subscriptionData = {
      user_id: userIdToUse,
      plan_id: planId,
      billing_cycle: billingCycle,
      status: subscription.status, // Use 'status' not 'subscription_status'
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripe_price_id: price.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    }
    
    // Upsert subscription in database
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error upserting subscription:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Successfully synced subscription to database:', data)
    return { success: true }
    
  } catch (error: any) {
    console.error('Error syncing subscription:', error)
    return { success: false, error: error.message }
  }
}

// Sync subscription by user ID (finds their Stripe subscription)
export async function syncUserSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Syncing subscription for user ${userId}`)
    
    // First, get the user's subscription from database
    const { data: dbSub, error: dbError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .single()
    
    if (dbError || !dbSub?.stripe_subscription_id) {
      console.log('No subscription found in database for user')
      return { success: false, error: 'No subscription found' }
    }
    
    // Sync the Stripe subscription
    return await syncStripeSubscriptionToDatabase(dbSub.stripe_subscription_id, userId)
    
  } catch (error: any) {
    console.error('Error syncing user subscription:', error)
    return { success: false, error: error.message }
  }
}

// Auto-sync subscription on client side (checks if data is stale)
export async function autoSyncSubscriptionIfNeeded(
  userId: string,
  lastSyncTime?: Date
): Promise<boolean> {
  // Only sync if data is older than 5 minutes
  const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes
  
  if (lastSyncTime && Date.now() - lastSyncTime.getTime() < SYNC_INTERVAL) {
    return false // No sync needed
  }
  
  const result = await syncUserSubscription(userId)
  return result.success
}
import { createClient } from '@/lib/supabase/client'
import { PlanId } from './plans'

export interface ClientSubscription {
  hasSubscription: boolean
  planId: PlanId
  status: string
  billingCycle?: string
  isTrialing: boolean
  trialEndsAt?: string
  currentPeriodEnd?: string
  // Scheduled change fields
  scheduledPlanId?: PlanId
  scheduledBillingCycle?: string
  scheduledChangeDate?: string
  scheduledStripePriceId?: string
  stripeScheduleId?: string
}

export async function getClientSubscription(autoSync: boolean = true): Promise<ClientSubscription | null> {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return null
    }
    
    // Auto-sync subscription from Stripe if enabled and data might be stale
    if (autoSync) {
      // Check if we should sync (only if subscription exists and might be outdated)
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('updated_at, stripe_subscription_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (existingSub?.stripe_subscription_id) {
        const lastUpdate = existingSub.updated_at ? new Date(existingSub.updated_at) : null
        const timeSinceUpdate = lastUpdate ? Date.now() - lastUpdate.getTime() : Infinity
        
        // Sync if data is older than 5 minutes
        if (timeSinceUpdate > 5 * 60 * 1000) {
          console.log('Subscription data is stale, syncing from Stripe...')
          try {
            await fetch('/api/subscription/sync-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            })
          } catch (syncError) {
            console.error('Failed to sync subscription:', syncError)
            // Continue anyway, use potentially stale data
          }
        }
      }
    }
    
    // Get user's ACTIVE subscription (potentially updated)
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    if (error || !subscription) {
      // No subscription, return free plan
      return {
        hasSubscription: false,
        planId: 'free' as PlanId,
        status: 'active',
        isTrialing: false
      }
    }
    
    // Check if user has an active paid subscription
    const hasActiveSubscription = 
      subscription.plan_id !== 'free' && 
      ['active', 'trialing'].includes(subscription.status)
    
    return {
      hasSubscription: hasActiveSubscription,
      planId: subscription.plan_id as PlanId,
      status: subscription.status,
      billingCycle: subscription.billing_cycle,
      isTrialing: subscription.status === 'trialing',
      trialEndsAt: subscription.trial_end,
      currentPeriodEnd: subscription.current_period_end,
      // Include scheduled change info if present
      scheduledPlanId: subscription.scheduled_plan_id as PlanId | undefined,
      scheduledBillingCycle: subscription.scheduled_billing_cycle,
      scheduledChangeDate: subscription.scheduled_change_date,
      scheduledStripePriceId: subscription.scheduled_stripe_price_id,
      stripeScheduleId: subscription.stripe_schedule_id
    }
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

export async function refreshSubscriptionStatus() {
  // Force a refresh of the subscription status
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Invalidate any cached data and refetch
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()
    
  if (error) {
    console.error('Error refreshing subscription:', error)
  }
  
  return data
}
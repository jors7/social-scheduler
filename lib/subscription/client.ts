import { createClient } from '@/lib/supabase/client'
import { PlanId } from './plans'

export interface ClientSubscription {
  hasSubscription: boolean
  planId: PlanId
  status: string
  isTrialing: boolean
  trialEndsAt?: string
  currentPeriodEnd?: string
}

export async function getClientSubscription(): Promise<ClientSubscription | null> {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return null
    }
    
    // Get user's subscription
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
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
      isTrialing: subscription.status === 'trialing',
      trialEndsAt: subscription.trial_end,
      currentPeriodEnd: subscription.current_period_end
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
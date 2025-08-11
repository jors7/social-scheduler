import { createClient } from '@/lib/supabase/server'

export interface AccountLimit {
  maxAccounts: number;
  currentCount: number;
  canAddMore: boolean;
  remainingSlots: number;
}

export async function checkAccountLimits(userId: string): Promise<AccountLimit> {
  const supabase = createClient()
  
  // Get user's current active accounts count
  const { data: accounts, error: accountsError } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
  
  if (accountsError) {
    console.error('Error fetching accounts:', accountsError)
    throw new Error('Failed to check account limits')
  }
  
  const currentCount = accounts?.length || 0
  
  // Get user's subscription plan limits
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select(`
      plan_id,
      status,
      subscription_plans!inner(
        limits
      )
    `)
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .single()
  
  let maxAccounts = 1 // Default to free plan limit
  
  if (!subError && subscription && subscription.subscription_plans) {
    const plans = subscription.subscription_plans as any
    const limits = Array.isArray(plans) ? plans[0]?.limits : plans.limits
    maxAccounts = limits?.connected_accounts || 1
  } else {
    // No subscription found, get free plan limits
    const { data: freePlan } = await supabase
      .from('subscription_plans')
      .select('limits')
      .eq('id', 'free')
      .single()
    
    if (freePlan) {
      const limits = freePlan.limits as any
      maxAccounts = limits?.connected_accounts || 1
    }
  }
  
  // -1 means unlimited
  const isUnlimited = maxAccounts === -1
  
  return {
    maxAccounts: isUnlimited ? Infinity : maxAccounts,
    currentCount,
    canAddMore: isUnlimited || currentCount < maxAccounts,
    remainingSlots: isUnlimited ? Infinity : Math.max(0, maxAccounts - currentCount)
  }
}

export async function getAccountsByPlatform(userId: string) {
  const supabase = createClient()
  
  const { data: accounts, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('platform', { ascending: true })
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching accounts:', error)
    return {}
  }
  
  // Group accounts by platform
  const groupedAccounts: Record<string, any[]> = {}
  
  accounts?.forEach(account => {
    if (!groupedAccounts[account.platform]) {
      groupedAccounts[account.platform] = []
    }
    groupedAccounts[account.platform].push(account)
  })
  
  return groupedAccounts
}

export async function canConnectNewAccount(userId: string): Promise<boolean> {
  const limits = await checkAccountLimits(userId)
  return limits.canAddMore
}

export function formatAccountLabel(account: any): string {
  if (account.account_label) {
    return account.account_label
  }
  
  if (account.username || account.account_username) {
    return `@${account.username || account.account_username}`
  }
  
  if (account.account_name) {
    return account.account_name
  }
  
  return `${account.platform} Account`
}
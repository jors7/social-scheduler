import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase'
import { PlanId, SubscriptionStatus, BillingCycle, SUBSCRIPTION_PLANS } from './plans'

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
}

export interface SubscriptionWithPlan extends UserSubscription {
  plan: typeof SUBSCRIPTION_PLANS[PlanId];
}

export interface UsageSummary {
  posts_used: number;
  posts_limit: number;
  ai_suggestions_used: number;
  ai_suggestions_limit: number;
  connected_accounts_used: number;
  connected_accounts_limit: number;
}

export class SubscriptionService {
  private supabase: ReturnType<typeof createServerClient<Database>>;

  constructor() {
    const cookieStore = cookies();
    this.supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
  }

  async getUserSubscription(userId?: string): Promise<SubscriptionWithPlan> {
    // Get current user if no userId provided
    if (!userId) {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      userId = user.id;
    }

    // Call the database function
    const { data, error } = await this.supabase
      .rpc('get_user_subscription', { user_uuid: userId })
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Type assertion for the subscription data
    const subscriptionData = data as {
      id?: string;
      plan_id: string;
      status: string;
      billing_cycle: string;
      current_period_start: string;
      current_period_end: string;
      trial_end?: string | null;
      cancel_at?: string | null;
      canceled_at?: string | null;
      stripe_subscription_id?: string | null;
      stripe_customer_id?: string | null;
    } | null;

    // If no subscription found, return free plan
    if (!subscriptionData) {
      return {
        id: 'free-default',
        user_id: userId,
        plan_id: 'free',
        status: 'active',
        billing_cycle: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trial_end: null,
        cancel_at: null,
        canceled_at: null,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        plan: SUBSCRIPTION_PLANS.free,
      };
    }

    // Get the plan details
    const plan = SUBSCRIPTION_PLANS[subscriptionData.plan_id as PlanId];

    return {
      id: subscriptionData.id || 'free-default',
      user_id: userId,
      plan_id: subscriptionData.plan_id as PlanId,
      status: subscriptionData.status as SubscriptionStatus,
      billing_cycle: subscriptionData.billing_cycle as BillingCycle,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      trial_end: subscriptionData.trial_end || null,
      cancel_at: subscriptionData.cancel_at || null,
      canceled_at: subscriptionData.canceled_at || null,
      stripe_subscription_id: subscriptionData.stripe_subscription_id || null,
      stripe_customer_id: subscriptionData.stripe_customer_id || null,
      plan,
    };
  }

  async checkUsageLimit(
    resourceType: 'posts' | 'ai_suggestions' | 'connected_accounts',
    increment: number = 1,
    userId?: string
  ): Promise<boolean> {
    // Get current user if no userId provided
    if (!userId) {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      userId = user.id;
    }

    // Map resource type to database column
    const resourceMap = {
      posts: 'posts_per_month',
      ai_suggestions: 'ai_suggestions_per_month',
      connected_accounts: 'connected_accounts',
    };

    const { data, error } = await this.supabase
      .rpc('check_usage_limit', {
        user_uuid: userId,
        resource: resourceMap[resourceType],
        increment,
      });

    if (error) throw error;
    return data as boolean;
  }

  async incrementUsage(
    resourceType: 'posts' | 'ai_suggestions',
    increment: number = 1,
    userId?: string
  ): Promise<void> {
    // Get current user if no userId provided
    if (!userId) {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      userId = user.id;
    }

    const { error } = await this.supabase
      .rpc('increment_usage', {
        user_uuid: userId,
        resource: resourceType,
        increment,
      });

    if (error) throw error;
  }

  async getUsageSummary(userId?: string): Promise<UsageSummary> {
    // Get current user if no userId provided
    if (!userId) {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      userId = user.id;
    }

    const { data, error } = await this.supabase
      .rpc('get_usage_summary', { user_uuid: userId })
      .single();

    if (error) throw error;

    // Type assertion for usage summary data
    const usageData = data as {
      posts_used: number;
      posts_limit: number;
      ai_suggestions_used: number;
      ai_suggestions_limit: number;
      connected_accounts_used: number;
      connected_accounts_limit: number;
    };

    return {
      posts_used: usageData.posts_used,
      posts_limit: usageData.posts_limit === -1 ? Infinity : usageData.posts_limit,
      ai_suggestions_used: usageData.ai_suggestions_used,
      ai_suggestions_limit: usageData.ai_suggestions_limit === -1 ? Infinity : usageData.ai_suggestions_limit,
      connected_accounts_used: usageData.connected_accounts_used,
      connected_accounts_limit: usageData.connected_accounts_limit === -1 ? Infinity : usageData.connected_accounts_limit,
    };
  }

  async canUseFeature(feature: 'posts' | 'ai_suggestions' | 'analytics' | 'team', userId?: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    
    switch (feature) {
      case 'posts':
        return subscription.plan.limits.posts_per_month !== 0;
      case 'ai_suggestions':
        return subscription.plan.features.ai_suggestions;
      case 'analytics':
        return subscription.plan.features.analytics !== false;
      case 'team':
        return subscription.plan.features.team_features === true;
      default:
        return false;
    }
  }

  async getConnectedAccountsCount(userId?: string): Promise<number> {
    // Get current user if no userId provided
    if (!userId) {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      userId = user.id;
    }

    const { count, error } = await this.supabase
      .from('social_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  }

  async canConnectMoreAccounts(userId?: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    const currentCount = await this.getConnectedAccountsCount(userId);
    
    // -1 means unlimited
    if (subscription.plan.limits.connected_accounts === -1) return true;
    
    return currentCount < subscription.plan.limits.connected_accounts;
  }

  async createOrUpdateSubscription(
    userId: string,
    planId: PlanId,
    billingCycle: BillingCycle,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    status: SubscriptionStatus = 'active',
    trialEnd?: Date
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

    const { error } = await this.supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planId,
        status,
        billing_cycle: billingCycle,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_end: trialEnd?.toISOString() || null,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
      }, {
        onConflict: 'user_id',
      });

    if (error) throw error;
  }

  async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription.stripe_subscription_id) {
      throw new Error('No active subscription to cancel');
    }

    const update: any = {
      canceled_at: new Date().toISOString(),
    };

    if (cancelAtPeriodEnd) {
      update.cancel_at = subscription.current_period_end;
    } else {
      update.status = 'canceled';
    }

    const { error } = await this.supabase
      .from('user_subscriptions')
      .update(update)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async recordPayment(
    userId: string,
    amount: number,
    currency: string = 'usd',
    status: 'succeeded' | 'failed' | 'pending' | 'refunded',
    stripePaymentIntentId?: string,
    stripeInvoiceId?: string,
    subscriptionId?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        subscription_id: subscriptionId || null,
        amount,
        currency,
        status,
        stripe_payment_intent_id: stripePaymentIntentId || null,
        stripe_invoice_id: stripeInvoiceId || null,
      });

    if (error) throw error;
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
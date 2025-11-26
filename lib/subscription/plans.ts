export type PlanId = 'free' | 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trialing' | 'past_due';

export interface PlanFeatures {
  posts_per_month: number | 'unlimited';
  platforms: number | 'all';
  analytics: boolean | 'basic' | 'advanced';
  ai_suggestions: boolean;
  trial_days: number;
  team_features?: boolean;
  priority_support?: boolean;
  white_label?: boolean;
}

export interface PlanLimits {
  posts_per_month: number; // -1 for unlimited
  connected_accounts: number; // -1 for unlimited
  ai_suggestions_per_month: number; // -1 for unlimited
  storage_mb: number; // Storage limit in MB, 0 for no storage
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: PlanFeatures;
  limits: PlanLimits;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Limited access for cancelled subscriptions',
    price_monthly: 0,
    price_yearly: 0,
    features: {
      posts_per_month: 1,
      platforms: 'all',
      analytics: false,
      ai_suggestions: false,
      trial_days: 0,
    },
    limits: {
      posts_per_month: 1,
      connected_accounts: 1,
      ai_suggestions_per_month: 0,
      storage_mb: 50, // 50 MB for basic media storage
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individuals and small businesses',
    price_monthly: 900, // $9.00
    price_yearly: 9000, // $90.00 (save $18)
    features: {
      posts_per_month: 'unlimited',
      platforms: 'all',
      analytics: 'basic',
      ai_suggestions: true,
      trial_days: 7,
    },
    limits: {
      posts_per_month: -1,
      connected_accounts: 5,
      ai_suggestions_per_month: 50,
      storage_mb: 0,
    },
    // Required environment variables - no hardcoded fallbacks
    stripe_price_id_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    stripe_price_id_yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    price_monthly: 1900, // $19.00
    price_yearly: 19000, // $190.00 (save $38)
    features: {
      posts_per_month: 'unlimited',
      platforms: 'all',
      analytics: 'advanced',
      ai_suggestions: true,
      trial_days: 7,
    },
    limits: {
      posts_per_month: -1,
      connected_accounts: 15,
      ai_suggestions_per_month: 150,
      storage_mb: 250,
    },
    // Required environment variables - no hardcoded fallbacks
    stripe_price_id_monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
    stripe_price_id_yearly: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Everything you need for large teams',
    price_monthly: 2900, // $29.00
    price_yearly: 29000, // $290.00 (save $58)
    features: {
      posts_per_month: 'unlimited',
      platforms: 'all',
      analytics: 'advanced',
      ai_suggestions: true,
      team_features: true,
      priority_support: true,
      white_label: true,
      trial_days: 7,
    },
    limits: {
      posts_per_month: -1,
      connected_accounts: -1,
      ai_suggestions_per_month: 300,
      storage_mb: 500,
    },
    // Required environment variables - no hardcoded fallbacks
    stripe_price_id_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    stripe_price_id_yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  },
};

/**
 * Validate that all required Stripe price IDs are configured
 * Call this at app startup or before checkout
 */
export function validateStripePriceIds(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  const plans: PlanId[] = ['starter', 'professional', 'enterprise'];

  for (const planId of plans) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan.stripe_price_id_monthly) {
      missing.push(`STRIPE_${planId.toUpperCase()}_MONTHLY_PRICE_ID`);
    }
    if (!plan.stripe_price_id_yearly) {
      missing.push(`STRIPE_${planId.toUpperCase()}_YEARLY_PRICE_ID`);
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Get the Stripe price ID for a plan, throwing if not configured
 */
export function getStripePriceId(planId: PlanId, billingCycle: BillingCycle): string {
  if (planId === 'free') {
    throw new Error('Free plan does not have a Stripe price ID');
  }

  const plan = SUBSCRIPTION_PLANS[planId];
  const priceId = billingCycle === 'monthly'
    ? plan.stripe_price_id_monthly
    : plan.stripe_price_id_yearly;

  if (!priceId) {
    const envVar = `STRIPE_${planId.toUpperCase()}_${billingCycle.toUpperCase()}_PRICE_ID`;
    throw new Error(
      `Stripe price ID not configured for ${planId} (${billingCycle}). ` +
      `Please set the ${envVar} environment variable.`
    );
  }

  return priceId;
}

export function getPlanById(planId: PlanId): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[planId];
}

export function calculateAnnualSavings(plan: SubscriptionPlan): number {
  const monthlyTotal = plan.price_monthly * 12;
  const yearlyTotal = plan.price_yearly;
  return monthlyTotal - yearlyTotal;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatPriceCompact(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function getTrialEndDate(planId: PlanId): Date | null {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan.features.trial_days) return null;
  
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + plan.features.trial_days);
  return trialEnd;
}
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
    description: 'Get started with basic features',
    price_monthly: 0,
    price_yearly: 0,
    features: {
      posts_per_month: 0,
      platforms: 0,
      analytics: false,
      ai_suggestions: false,
      trial_days: 0,
    },
    limits: {
      posts_per_month: 0,
      connected_accounts: 0,
      ai_suggestions_per_month: 0,
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
    },
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
    },
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
    },
    stripe_price_id_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    stripe_price_id_yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  },
};

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
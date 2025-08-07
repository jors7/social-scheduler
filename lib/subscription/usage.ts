import { SubscriptionService } from './service';
import { toast } from 'sonner';

export type ResourceType = 'posts' | 'ai_suggestions' | 'connected_accounts';

export interface UsageCheck {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  message?: string;
}

export async function checkAndIncrementUsage(
  resourceType: ResourceType,
  increment: number = 1,
  showToast: boolean = true
): Promise<UsageCheck> {
  try {
    // Create service instance inside the function
    const subscriptionService = new SubscriptionService();
    const usage = await subscriptionService.getUsageSummary();
    const subscription = await subscriptionService.getUserSubscription();
    
    let currentUsage: number;
    let limit: number;
    let resourceName: string;
    
    switch (resourceType) {
      case 'posts':
        currentUsage = usage.posts_used;
        limit = usage.posts_limit;
        resourceName = 'posts';
        break;
      case 'ai_suggestions':
        currentUsage = usage.ai_suggestions_used;
        limit = usage.ai_suggestions_limit;
        resourceName = 'AI suggestions';
        break;
      case 'connected_accounts':
        currentUsage = usage.connected_accounts_used;
        limit = usage.connected_accounts_limit;
        resourceName = 'connected accounts';
        break;
    }
    
    // Check if limit would be exceeded
    if (limit !== Infinity && currentUsage + increment > limit) {
      const message = `You've reached your ${resourceName} limit (${currentUsage}/${limit}). Upgrade to ${getUpgradePlanName(subscription.plan_id)} to continue.`;
      
      if (showToast) {
        toast.error(message, {
          action: {
            label: 'Upgrade',
            onClick: () => window.location.href = '/pricing',
          },
        });
      }
      
      return {
        allowed: false,
        currentUsage,
        limit,
        message,
      };
    }
    
    // For posts and AI suggestions, increment the usage
    if (resourceType !== 'connected_accounts') {
      await subscriptionService.incrementUsage(resourceType as 'posts' | 'ai_suggestions', increment);
    }
    
    return {
      allowed: true,
      currentUsage: currentUsage + increment,
      limit,
    };
  } catch (error) {
    console.error('Error checking usage:', error);
    if (showToast) {
      toast.error('Failed to check usage limits');
    }
    return {
      allowed: false,
      currentUsage: 0,
      limit: 0,
      message: 'Failed to check usage limits',
    };
  }
}

export async function checkUsageOnly(resourceType: ResourceType): Promise<UsageCheck> {
  try {
    const usage = await subscriptionService.getUsageSummary();
    
    let currentUsage: number;
    let limit: number;
    
    switch (resourceType) {
      case 'posts':
        currentUsage = usage.posts_used;
        limit = usage.posts_limit;
        break;
      case 'ai_suggestions':
        currentUsage = usage.ai_suggestions_used;
        limit = usage.ai_suggestions_limit;
        break;
      case 'connected_accounts':
        currentUsage = usage.connected_accounts_used;
        limit = usage.connected_accounts_limit;
        break;
    }
    
    return {
      allowed: limit === Infinity || currentUsage < limit,
      currentUsage,
      limit,
    };
  } catch (error) {
    console.error('Error checking usage:', error);
    return {
      allowed: false,
      currentUsage: 0,
      limit: 0,
      message: 'Failed to check usage limits',
    };
  }
}

function getUpgradePlanName(currentPlan: string): string {
  switch (currentPlan) {
    case 'free':
      return 'Starter';
    case 'starter':
      return 'Professional';
    case 'professional':
      return 'Enterprise';
    default:
      return 'a paid plan';
  }
}

export function formatUsageDisplay(current: number, limit: number): string {
  if (limit === Infinity) {
    return `${current} used`;
  }
  return `${current}/${limit}`;
}

export function getUsagePercentage(current: number, limit: number): number {
  if (limit === Infinity || limit === 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

export function isNearLimit(current: number, limit: number, threshold: number = 0.8): boolean {
  if (limit === Infinity) return false;
  return current / limit >= threshold;
}
/**
 * GA4 Custom Event Tracking
 *
 * Usage:
 *   import { trackEvent } from '@/lib/analytics/events'
 *   trackEvent('signup_completed', { method: 'email' })
 */

type EventParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Track a custom event in GA4
 */
export function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params)
  }
}

// ============================================
// Signup & Authentication Events
// ============================================

export function trackSignupStarted(method: 'email' | 'google' = 'email') {
  trackEvent('signup_started', { method })
}

export function trackSignupCompleted(method: 'email' | 'google' = 'email') {
  trackEvent('signup_completed', { method })
}

export function trackLogin(method: 'email' | 'google' | 'magic_link' = 'email') {
  trackEvent('login', { method })
}

// ============================================
// Subscription & Payment Events
// ============================================

export function trackPlanSelected(plan: string, billingCycle: 'monthly' | 'yearly') {
  trackEvent('plan_selected', { plan, billing_cycle: billingCycle })
}

export function trackCheckoutStarted(plan: string, value: number) {
  trackEvent('checkout_started', { plan, value, currency: 'USD' })
}

export function trackSubscriptionCreated(plan: string, value: number) {
  trackEvent('subscription_created', { plan, value, currency: 'USD' })
}

export function trackSubscriptionCancelled(plan: string) {
  trackEvent('subscription_cancelled', { plan })
}

// ============================================
// Core Feature Events
// ============================================

export function trackPostCreated(platforms: string[], hasMedia: boolean) {
  trackEvent('post_created', {
    platform_count: platforms.length,
    platforms: platforms.join(','),
    has_media: hasMedia,
  })
}

export function trackPostScheduled(platforms: string[], hasMedia: boolean) {
  trackEvent('post_scheduled', {
    platform_count: platforms.length,
    platforms: platforms.join(','),
    has_media: hasMedia,
  })
}

export function trackDraftSaved() {
  trackEvent('draft_saved')
}

// ============================================
// Account & Integration Events
// ============================================

export function trackAccountConnected(platform: string) {
  trackEvent('account_connected', { platform })
}

export function trackAccountDisconnected(platform: string) {
  trackEvent('account_disconnected', { platform })
}

// ============================================
// AI Feature Events
// ============================================

export function trackAISuggestionRequested(tone: string) {
  trackEvent('ai_suggestion_requested', { tone })
}

export function trackAISuggestionUsed(tone: string) {
  trackEvent('ai_suggestion_used', { tone })
}

// ============================================
// Engagement Events
// ============================================

export function trackFeatureViewed(feature: string) {
  trackEvent('feature_viewed', { feature })
}

export function trackUpgradePromptShown(feature: string) {
  trackEvent('upgrade_prompt_shown', { feature })
}

export function trackUpgradePromptClicked(feature: string) {
  trackEvent('upgrade_prompt_clicked', { feature })
}

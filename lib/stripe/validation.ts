/**
 * Stripe environment validation utilities
 * Ensures we're using the correct Stripe keys in each environment
 */

export function validateStripeKeys() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const isProduction = process.env.NODE_ENV === 'production'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  // Only validate if we have keys (allows build to complete)
  if (!secretKey) {
    console.warn('⚠️  STRIPE_SECRET_KEY is not set')
    return { isLiveMode: false, isTestMode: false, isProduction, isProductionDomain: false }
  }

  // Publishable key is optional for server-side only flows
  if (!publishableKey) {
    console.warn('⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set (client-side Stripe features may not work)')
  }

  // Check if we're using test keys in production
  const isTestKey = secretKey.startsWith('sk_test_')
  const isLiveKey = secretKey.startsWith('sk_live_')
  const isTestPublishableKey = publishableKey?.startsWith('pk_test_') || false
  const isLivePublishableKey = publishableKey?.startsWith('pk_live_') || false

  // Production domain check
  const isProductionDomain = appUrl.includes('socialcal.app')

  if (isProductionDomain && isTestKey) {
    throw new Error(
      '🚨 CRITICAL: Using TEST Stripe secret key on production domain! ' +
      'Please set STRIPE_SECRET_KEY to your live mode key (sk_live_...)'
    )
  }

  if (isProductionDomain && isTestPublishableKey) {
    throw new Error(
      '🚨 CRITICAL: Using TEST Stripe publishable key on production domain! ' +
      'Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your live mode key (pk_live_...)'
    )
  }

  if (!isProductionDomain && isLiveKey) {
    console.warn(
      '⚠️  WARNING: Using LIVE Stripe keys on non-production domain. ' +
      'This will process real payments! Make sure this is intentional.'
    )
  }

  // Ensure secret and publishable keys match (both test or both live)
  if ((isTestKey && isLivePublishableKey) || (isLiveKey && isTestPublishableKey)) {
    throw new Error(
      '🚨 CRITICAL: Stripe key mismatch! Secret key and publishable key must both be test or both be live. ' +
      `Current: secret=${isTestKey ? 'test' : 'live'}, publishable=${isTestPublishableKey ? 'test' : 'live'}`
    )
  }

  return {
    isLiveMode: isLiveKey,
    isTestMode: isTestKey,
    isProduction,
    isProductionDomain,
  }
}

export function getStripeKeyInfo() {
  const secretKey = process.env.STRIPE_SECRET_KEY || ''
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

  return {
    hasSecretKey: !!secretKey,
    hasPublishableKey: !!publishableKey,
    secretKeyType: secretKey.startsWith('sk_test_') ? 'test' : secretKey.startsWith('sk_live_') ? 'live' : 'unknown',
    publishableKeyType: publishableKey.startsWith('pk_test_') ? 'test' : publishableKey.startsWith('pk_live_') ? 'live' : 'unknown',
  }
}

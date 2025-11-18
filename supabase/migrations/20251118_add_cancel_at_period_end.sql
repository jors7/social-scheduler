-- ============================================================
-- Add cancel_at_period_end to user_subscriptions
-- ============================================================
--
-- This migration adds a boolean flag to track whether a subscription
-- is set to cancel at the end of the current period (trial or billing).
--
-- Stripe's cancel_at_period_end flag indicates:
-- - true: Subscription is cancelled but remains active until period ends
-- - false: Subscription will renew normally
--
-- This helps distinguish between:
-- - Active trials that will convert to paid subscriptions
-- - Cancelled trials that won't renew
-- ============================================================

ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_subscriptions.cancel_at_period_end IS
  'Stripe flag indicating if subscription will cancel at period end (trial or billing period).
   true = subscription cancelled but still active until period ends.
   false = subscription will renew normally.';

-- Create an index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_cancel_at_period_end
ON user_subscriptions(cancel_at_period_end)
WHERE cancel_at_period_end = true;

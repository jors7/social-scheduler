-- Add billing_cycle column if it doesn't exist
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'
CHECK (billing_cycle IN ('monthly', 'annual', 'lifetime'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_billing_cycle 
ON user_subscriptions(billing_cycle);

-- Update existing records based on their Stripe subscription
-- This is a placeholder - you may need to sync with actual Stripe data
UPDATE user_subscriptions 
SET billing_cycle = 'monthly'
WHERE billing_cycle IS NULL;

-- Verify the changes
SELECT 
  user_id,
  plan_id,
  subscription_status,
  billing_cycle,
  stripe_subscription_id
FROM user_subscriptions
LIMIT 10;
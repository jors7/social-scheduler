-- Add subscription_status column to user_subscriptions table
-- This is critical for tracking who is actively paying

-- Step 1: Add the subscription_status column if it doesn't exist
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Step 2: Add a check constraint for valid status values
ALTER TABLE user_subscriptions 
ADD CONSTRAINT subscription_status_check 
CHECK (subscription_status IN ('active', 'trialing', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'inactive'));

-- Step 3: Update existing records based on their stripe_subscription_id
-- If they have a stripe subscription, assume it's active (you may need to sync with Stripe later)
UPDATE user_subscriptions 
SET subscription_status = CASE 
  WHEN stripe_subscription_id IS NOT NULL THEN 'active'
  WHEN trial_ends_at > NOW() THEN 'trialing'
  ELSE 'inactive'
END
WHERE subscription_status IS NULL OR subscription_status = 'inactive';

-- Step 4: Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status 
ON user_subscriptions(subscription_status);

-- Step 5: Add a comment explaining the column
COMMENT ON COLUMN user_subscriptions.subscription_status IS 'Current subscription status from Stripe: active, trialing, canceled, past_due, incomplete, incomplete_expired, unpaid, or inactive';

-- Verify the changes
SELECT 
  user_id,
  plan_id,
  subscription_status,
  stripe_subscription_id,
  trial_ends_at,
  created_at
FROM user_subscriptions
LIMIT 10;
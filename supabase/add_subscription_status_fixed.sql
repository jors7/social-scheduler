-- First, let's see what columns we actually have
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- Add subscription_status column to user_subscriptions table
-- Step 1: Add the subscription_status column if it doesn't exist
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Step 2: Add a check constraint for valid status values (if not exists)
DO $$ 
BEGIN
  ALTER TABLE user_subscriptions 
  ADD CONSTRAINT subscription_status_check 
  CHECK (subscription_status IN ('active', 'trialing', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'inactive'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Update existing records based on available data
-- Since we don't have trial_ends_at, we'll use simpler logic
UPDATE user_subscriptions 
SET subscription_status = CASE 
  WHEN stripe_subscription_id IS NOT NULL THEN 'active'
  WHEN plan_id != 'free' THEN 'active'  -- Assume paid plans are active
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
  created_at
FROM user_subscriptions
LIMIT 10;
-- Add is_suspended column to track user suspension status
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- Add suspended_at timestamp
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;

-- Add suspended_by to track which admin suspended the user
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_suspended 
ON user_subscriptions(is_suspended);

-- Update any users who might have been marked as suspended
UPDATE user_subscriptions 
SET is_suspended = TRUE, suspended_at = NOW()
WHERE subscription_status = 'suspended';

-- Check the results
SELECT 
  user_id,
  plan_id,
  subscription_status,
  is_suspended,
  suspended_at,
  suspended_by
FROM user_subscriptions
LIMIT 10;
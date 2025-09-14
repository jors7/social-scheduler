-- Migration to fix subscription conflicts and handle multiple subscriptions properly
-- This addresses the bug where users could have multiple active Stripe subscriptions

-- Step 1: Add new columns to track subscription state better
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS replaced_by_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS replacement_reason TEXT;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active 
ON user_subscriptions (user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_id 
ON user_subscriptions (stripe_subscription_id);

-- Step 3: Drop the problematic unique constraint on user_id
-- This was causing subscription overwrites
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_key;

-- Step 4: Add a new unique constraint that allows multiple subscriptions per user
-- but ensures stripe_subscription_id is unique
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_stripe_subscription_id_unique 
UNIQUE (stripe_subscription_id);

-- Step 5: Create a function to ensure only one active subscription per user
CREATE OR REPLACE FUNCTION ensure_single_active_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- If this subscription is being marked as active
  IF NEW.is_active = true THEN
    -- Deactivate all other subscriptions for this user
    UPDATE user_subscriptions 
    SET 
      is_active = false,
      replaced_by_subscription_id = NEW.stripe_subscription_id,
      replacement_reason = 'Replaced by newer subscription',
      updated_at = NOW()
    WHERE 
      user_id = NEW.user_id 
      AND id != NEW.id
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to enforce single active subscription
DROP TRIGGER IF EXISTS enforce_single_active_subscription ON user_subscriptions;
CREATE TRIGGER enforce_single_active_subscription
AFTER INSERT OR UPDATE OF is_active ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION ensure_single_active_subscription();

-- Step 7: Function to get the current active subscription for a user
CREATE OR REPLACE FUNCTION get_active_subscription(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  plan_id TEXT,
  status TEXT,
  billing_cycle TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    us.plan_id,
    us.status,
    us.billing_cycle,
    us.stripe_subscription_id,
    us.current_period_end
  FROM user_subscriptions us
  WHERE 
    us.user_id = user_uuid 
    AND us.is_active = true
    AND us.status IN ('active', 'trialing')
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Fix existing data - mark only the most recent/valuable subscription as active
WITH ranked_subs AS (
  SELECT 
    id,
    user_id,
    plan_id,
    status,
    created_at,
    current_period_end,
    -- Rank subscriptions: active > trialing > others, then by plan value, then by creation date
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE status 
          WHEN 'active' THEN 1 
          WHEN 'trialing' THEN 2 
          ELSE 3 
        END,
        CASE plan_id 
          WHEN 'enterprise' THEN 1 
          WHEN 'professional' THEN 2 
          WHEN 'starter' THEN 3 
          ELSE 4 
        END,
        created_at DESC
    ) as rn
  FROM user_subscriptions
)
UPDATE user_subscriptions us
SET 
  is_active = (rs.rn = 1),
  updated_at = NOW()
FROM ranked_subs rs
WHERE us.id = rs.id;

-- Step 9: Add RLS policy for active subscriptions
CREATE POLICY "Users can view their active subscription" ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id AND is_active = true);

-- Step 10: Create a view for easier access to active subscriptions
CREATE OR REPLACE VIEW active_user_subscriptions AS
SELECT 
  us.*,
  sp.name as plan_name,
  sp.price_monthly,
  sp.price_yearly,
  sp.features
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.is_active = true
  AND us.status IN ('active', 'trialing');

-- Grant access to the view
GRANT SELECT ON active_user_subscriptions TO authenticated;

-- Step 11: Add logging table for subscription changes (for debugging)
CREATE TABLE IF NOT EXISTS subscription_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_subscription_id TEXT,
  new_subscription_id TEXT,
  old_plan_id TEXT,
  new_plan_id TEXT,
  change_type TEXT, -- 'upgrade', 'downgrade', 'cancel', 'reactivate'
  change_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS for the log table
ALTER TABLE subscription_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their subscription changes" ON subscription_change_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_subscription_change_log_user_id 
ON subscription_change_log (user_id, created_at DESC);

COMMENT ON TABLE subscription_change_log IS 'Audit log for tracking subscription changes and debugging billing issues';
COMMENT ON COLUMN user_subscriptions.is_active IS 'Whether this is the currently active subscription for the user';
COMMENT ON COLUMN user_subscriptions.replaced_by_subscription_id IS 'If this subscription was replaced, the ID of the new subscription';
COMMENT ON COLUMN user_subscriptions.replacement_reason IS 'Why this subscription was replaced (upgrade, downgrade, etc)';
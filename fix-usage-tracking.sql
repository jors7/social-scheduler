-- IMPORTANT: Run this SQL directly in Supabase SQL Editor
-- This fixes the AI suggestions counter and usage tracking

-- 1. First, ensure the subscription_plans table has the correct limits
UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '50')
WHERE id = 'starter';

UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '150')
WHERE id = 'professional';

UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '300')
WHERE id = 'enterprise';

UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '0')
WHERE id = 'free';

-- 2. Fix the get_usage_summary function to properly read from JSONB fields
CREATE OR REPLACE FUNCTION get_usage_summary(user_uuid UUID)
RETURNS TABLE (
  posts_used INTEGER,
  posts_limit INTEGER,
  ai_suggestions_used INTEGER,
  ai_suggestions_limit INTEGER,
  connected_accounts_used INTEGER,
  connected_accounts_limit INTEGER
) AS $$
DECLARE
  v_plan_id TEXT;
  v_period_start TIMESTAMP WITH TIME ZONE;
  v_limits JSONB;
BEGIN
  -- Get user's current plan
  SELECT us.plan_id INTO v_plan_id
  FROM user_subscriptions us
  WHERE us.user_id = user_uuid
  AND us.status IN ('active', 'trialing', 'past_due')
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- Default to free plan if no subscription
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
  END IF;
  
  -- Get the limits JSONB for this plan
  SELECT limits INTO v_limits
  FROM subscription_plans
  WHERE id = v_plan_id;
  
  v_period_start := date_trunc('month', CURRENT_TIMESTAMP);
  
  RETURN QUERY
  SELECT
    -- Posts used this month
    COALESCE((
      SELECT SUM(count)::INTEGER 
      FROM usage_tracking 
      WHERE user_id = user_uuid 
      AND resource_type = 'posts'
      AND period_start >= v_period_start
    ), 0) AS posts_used,
    
    -- Posts limit from JSONB
    COALESCE((v_limits->>'posts_per_month')::INTEGER, 2) AS posts_limit,
    
    -- AI suggestions used this month
    COALESCE((
      SELECT SUM(count)::INTEGER 
      FROM usage_tracking 
      WHERE user_id = user_uuid 
      AND resource_type = 'ai_suggestions'
      AND period_start >= v_period_start
    ), 0) AS ai_suggestions_used,
    
    -- AI suggestions limit from JSONB
    COALESCE((v_limits->>'ai_suggestions_per_month')::INTEGER, 0) AS ai_suggestions_limit,
    
    -- Connected accounts count
    (SELECT COUNT(*)::INTEGER FROM social_accounts WHERE user_id = user_uuid) AS connected_accounts_used,
    
    -- Connected accounts limit from JSONB
    COALESCE((v_limits->>'connected_accounts')::INTEGER, 1) AS connected_accounts_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verify the fix by checking a user's usage (optional - replace with your user_id)
-- SELECT * FROM get_usage_summary('8314a973-512e-43aa-a57d-dbbee681fccf');
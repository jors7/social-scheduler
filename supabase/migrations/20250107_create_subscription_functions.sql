-- Create function to get user subscription with plan details
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  plan_id TEXT,
  status TEXT,
  billing_cycle TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    us.user_id,
    us.plan_id,
    us.status,
    us.billing_cycle,
    us.current_period_start,
    us.current_period_end,
    us.trial_end,
    us.cancel_at,
    us.canceled_at,
    us.stripe_subscription_id,
    us.stripe_customer_id
  FROM user_subscriptions us
  WHERE us.user_id = user_uuid
  AND us.status IN ('active', 'trialing', 'past_due')
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  user_uuid UUID,
  resource TEXT,
  increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_id TEXT;
  v_limit INTEGER;
  v_current_usage INTEGER;
  v_period_start DATE;
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
  
  -- Get the limit for this resource from the plan
  SELECT 
    CASE 
      WHEN resource = 'posts_per_month' THEN sp.posts_per_month
      WHEN resource = 'ai_suggestions_per_month' THEN sp.ai_suggestions_per_month
      WHEN resource = 'connected_accounts' THEN sp.connected_accounts
      ELSE 0
    END INTO v_limit
  FROM subscription_plans sp
  WHERE sp.id = v_plan_id;
  
  -- If limit is -1 (unlimited), return true
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- For connected accounts, check count directly
  IF resource = 'connected_accounts' THEN
    SELECT COUNT(*) INTO v_current_usage
    FROM social_accounts
    WHERE user_id = user_uuid;
    
    RETURN (v_current_usage + increment) <= v_limit;
  END IF;
  
  -- For monthly resources, check usage in current period
  v_period_start := DATE_TRUNC('month', CURRENT_DATE);
  
  SELECT 
    CASE 
      WHEN resource = 'posts_per_month' THEN COALESCE(SUM(posts_count), 0)
      WHEN resource = 'ai_suggestions_per_month' THEN COALESCE(SUM(ai_suggestions_count), 0)
      ELSE 0
    END INTO v_current_usage
  FROM usage_tracking
  WHERE user_id = user_uuid
  AND period_start = v_period_start;
  
  -- Check if adding increment would exceed limit
  RETURN (v_current_usage + increment) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  user_uuid UUID,
  resource TEXT,
  increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_period_start DATE;
BEGIN
  v_period_start := DATE_TRUNC('month', CURRENT_DATE);
  
  -- Insert or update usage tracking
  INSERT INTO usage_tracking (
    user_id,
    period_start,
    posts_count,
    ai_suggestions_count
  ) VALUES (
    user_uuid,
    v_period_start,
    CASE WHEN resource = 'posts' THEN increment ELSE 0 END,
    CASE WHEN resource = 'ai_suggestions' THEN increment ELSE 0 END
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    posts_count = usage_tracking.posts_count + 
      CASE WHEN resource = 'posts' THEN increment ELSE 0 END,
    ai_suggestions_count = usage_tracking.ai_suggestions_count + 
      CASE WHEN resource = 'ai_suggestions' THEN increment ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get usage summary
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
  v_period_start DATE;
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
  
  v_period_start := DATE_TRUNC('month', CURRENT_DATE);
  
  RETURN QUERY
  SELECT
    -- Posts used this month
    COALESCE((
      SELECT posts_count 
      FROM usage_tracking 
      WHERE user_id = user_uuid 
      AND period_start = v_period_start
    ), 0) AS posts_used,
    
    -- Posts limit
    (SELECT posts_per_month FROM subscription_plans WHERE id = v_plan_id) AS posts_limit,
    
    -- AI suggestions used this month
    COALESCE((
      SELECT ai_suggestions_count 
      FROM usage_tracking 
      WHERE user_id = user_uuid 
      AND period_start = v_period_start
    ), 0) AS ai_suggestions_used,
    
    -- AI suggestions limit
    (SELECT ai_suggestions_per_month FROM subscription_plans WHERE id = v_plan_id) AS ai_suggestions_limit,
    
    -- Connected accounts count
    (SELECT COUNT(*)::INTEGER FROM social_accounts WHERE user_id = user_uuid) AS connected_accounts_used,
    
    -- Connected accounts limit
    (SELECT connected_accounts FROM subscription_plans WHERE id = v_plan_id) AS connected_accounts_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_usage_summary(UUID) TO authenticated;
-- Fix get_usage_summary function with correct period filtering and limit values
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
  subscription_record RECORD;
  v_period_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's subscription info
  SELECT * INTO subscription_record FROM get_user_subscription(user_uuid);
  v_period_start := date_trunc('month', CURRENT_TIMESTAMP);
  
  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(count)::INTEGER FROM usage_tracking WHERE user_id = user_uuid AND resource_type = 'posts' AND period_start >= v_period_start), 0) as posts_used,
    COALESCE((subscription_record.limits->'posts_per_month')::INTEGER, 2) as posts_limit,
    COALESCE((SELECT SUM(count)::INTEGER FROM usage_tracking WHERE user_id = user_uuid AND resource_type = 'ai_suggestions' AND period_start >= v_period_start), 0) as ai_suggestions_used,
    COALESCE((subscription_record.limits->'ai_suggestions_per_month')::INTEGER, 0) as ai_suggestions_limit,
    COALESCE((SELECT COUNT(*)::INTEGER FROM social_accounts WHERE user_id = user_uuid), 0) as connected_accounts_used,
    COALESCE((subscription_record.limits->'connected_accounts')::INTEGER, 1) as connected_accounts_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update subscription_plans with correct AI suggestion limits
UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '50')
WHERE id = 'starter';

UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '150')
WHERE id = 'professional';

UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '300')
WHERE id = 'enterprise';

-- Ensure free plan has correct limits
UPDATE subscription_plans 
SET limits = '{"posts_per_month": 2, "connected_accounts": 1, "ai_suggestions_per_month": 0}'::jsonb
WHERE id = 'free';
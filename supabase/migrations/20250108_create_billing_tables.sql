-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- succeeded, failed, pending
  description TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own payment history"
  ON payment_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create usage tracking function
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
  v_posts_limit INTEGER;
  v_ai_limit INTEGER;
  v_accounts_limit INTEGER;
BEGIN
  -- Get user's plan
  SELECT plan_id INTO v_plan_id
  FROM user_subscriptions
  WHERE user_id = user_uuid
  LIMIT 1;
  
  -- If no subscription, default to free plan
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
  END IF;
  
  -- Set limits based on plan
  CASE v_plan_id
    WHEN 'free' THEN
      v_posts_limit := 5;
      v_ai_limit := 0;
      v_accounts_limit := 2;
    WHEN 'starter' THEN
      v_posts_limit := 50;
      v_ai_limit := 20;
      v_accounts_limit := 5;
    WHEN 'professional' THEN
      v_posts_limit := 200;
      v_ai_limit := 100;
      v_accounts_limit := 10;
    WHEN 'enterprise' THEN
      v_posts_limit := -1; -- Unlimited
      v_ai_limit := -1; -- Unlimited
      v_accounts_limit := -1; -- Unlimited
    ELSE
      v_posts_limit := 5;
      v_ai_limit := 0;
      v_accounts_limit := 2;
  END CASE;
  
  -- Count actual usage
  RETURN QUERY
  SELECT
    -- Posts used this month
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM scheduled_posts
      WHERE user_id = user_uuid
      AND created_at >= date_trunc('month', CURRENT_DATE)
    ), 0) AS posts_used,
    v_posts_limit AS posts_limit,
    -- AI suggestions used this month (placeholder, would need actual tracking)
    0 AS ai_suggestions_used,
    v_ai_limit AS ai_suggestions_limit,
    -- Connected accounts
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM social_accounts
      WHERE user_id = user_uuid
    ), 0) AS connected_accounts_used,
    v_accounts_limit AS connected_accounts_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);
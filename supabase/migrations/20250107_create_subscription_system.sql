-- Subscription Plans Table
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- in cents
  price_yearly INTEGER NOT NULL, -- in cents
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Subscriptions Table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, expired, trialing, past_due
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  trial_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Payment History Table
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- succeeded, failed, pending, refunded
  description TEXT,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage Tracking Table
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- posts, ai_suggestions, connected_accounts
  count INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, resource_type, period_start)
);

-- Insert Default Subscription Plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits) VALUES
  ('free', 'Free', 'Get started with basic features', 0, 0, 
   '{"posts_per_month": 2, "platforms": 1, "analytics": false, "ai_suggestions": false, "trial_days": 0}',
   '{"posts_per_month": 2, "connected_accounts": 1, "ai_suggestions_per_month": 0}'),
  
  ('starter', 'Starter', 'Perfect for individuals and small businesses', 900, 9000,
   '{"posts_per_month": "unlimited", "platforms": "all", "analytics": "basic", "ai_suggestions": false, "trial_days": 7}',
   '{"posts_per_month": -1, "connected_accounts": 5, "ai_suggestions_per_month": 0}'),
  
  ('professional', 'Professional', 'Advanced features for growing businesses', 1900, 19000,
   '{"posts_per_month": "unlimited", "platforms": "all", "analytics": "advanced", "ai_suggestions": true, "trial_days": 7}',
   '{"posts_per_month": -1, "connected_accounts": 15, "ai_suggestions_per_month": 100}'),
  
  ('enterprise', 'Enterprise', 'Everything you need for large teams', 2900, 29000,
   '{"posts_per_month": "unlimited", "platforms": "all", "analytics": "advanced", "ai_suggestions": true, "team_features": true, "priority_support": true, "white_label": true, "trial_days": 7}',
   '{"posts_per_month": -1, "connected_accounts": -1, "ai_suggestions_per_month": -1}');

-- Create Indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_period ON usage_tracking(period_start, period_end);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Subscription plans are viewable by everyone" ON subscription_plans
  FOR SELECT USING (true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for payment_history
CREATE POLICY "Users can view their own payment history" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment history" ON payment_history
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view their own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage tracking" ON usage_tracking
  USING (auth.jwt()->>'role' = 'service_role');

-- Functions

-- Function to get user's current subscription
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  plan_id TEXT,
  plan_name TEXT,
  status TEXT,
  billing_cycle TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  features JSONB,
  limits JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.plan_id, 'free') as plan_id,
    COALESCE(sp.name, 'Free') as plan_name,
    COALESCE(us.status, 'active') as status,
    COALESCE(us.billing_cycle, 'monthly') as billing_cycle,
    us.current_period_end,
    us.trial_end,
    COALESCE(sp.features, '{"posts_per_month": 2, "platforms": 1}'::jsonb) as features,
    COALESCE(sp.limits, '{"posts_per_month": 2, "connected_accounts": 1}'::jsonb) as limits
  FROM auth.users u
  LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status IN ('active', 'trialing')
  LEFT JOIN subscription_plans sp ON COALESCE(us.plan_id, 'free') = sp.id
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check usage against limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  user_uuid UUID,
  resource TEXT,
  increment INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER;
  usage_limit INTEGER;
  period_start TIMESTAMP WITH TIME ZONE;
  subscription_record RECORD;
BEGIN
  -- Get user's subscription info
  SELECT * INTO subscription_record FROM get_user_subscription(user_uuid);
  
  -- Get limit for the resource
  usage_limit := COALESCE((subscription_record.limits->resource)::INTEGER, 0);
  
  -- -1 means unlimited
  IF usage_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Calculate current period start (beginning of current month)
  period_start := date_trunc('month', CURRENT_TIMESTAMP);
  
  -- Get current usage
  SELECT COALESCE(SUM(count), 0) INTO current_usage
  FROM usage_tracking
  WHERE user_id = user_uuid
    AND resource_type = resource
    AND period_start >= date_trunc('month', CURRENT_TIMESTAMP);
  
  -- Check if adding increment would exceed limit
  RETURN (current_usage + increment) <= usage_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  user_uuid UUID,
  resource TEXT,
  increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
  period_start_date TIMESTAMP WITH TIME ZONE;
  period_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate current period
  period_start_date := date_trunc('month', CURRENT_TIMESTAMP);
  period_end_date := date_trunc('month', CURRENT_TIMESTAMP + INTERVAL '1 month') - INTERVAL '1 second';
  
  -- Insert or update usage
  INSERT INTO usage_tracking (user_id, resource_type, count, period_start, period_end)
  VALUES (user_uuid, resource, increment, period_start_date, period_end_date)
  ON CONFLICT (user_id, resource_type, period_start)
  DO UPDATE SET 
    count = usage_tracking.count + increment,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get usage summary
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
  period_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's subscription info
  SELECT * INTO subscription_record FROM get_user_subscription(user_uuid);
  period_start := date_trunc('month', CURRENT_TIMESTAMP);
  
  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(count) FROM usage_tracking WHERE user_id = user_uuid AND resource_type = 'posts' AND period_start >= period_start), 0)::INTEGER as posts_used,
    COALESCE((subscription_record.limits->'posts_per_month')::INTEGER, 2) as posts_limit,
    COALESCE((SELECT SUM(count) FROM usage_tracking WHERE user_id = user_uuid AND resource_type = 'ai_suggestions' AND period_start >= period_start), 0)::INTEGER as ai_suggestions_used,
    COALESCE((subscription_record.limits->'ai_suggestions_per_month')::INTEGER, 0) as ai_suggestions_limit,
    COALESCE((SELECT COUNT(*) FROM social_accounts WHERE user_id = user_uuid), 0)::INTEGER as connected_accounts_used,
    COALESCE((subscription_record.limits->'connected_accounts')::INTEGER, 1) as connected_accounts_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
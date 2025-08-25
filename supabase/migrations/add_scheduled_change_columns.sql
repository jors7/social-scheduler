-- Add columns for tracking scheduled subscription changes
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS scheduled_plan_id TEXT,
ADD COLUMN IF NOT EXISTS scheduled_billing_cycle TEXT,
ADD COLUMN IF NOT EXISTS scheduled_change_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_schedule_id TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_scheduled_change 
ON user_subscriptions(scheduled_change_date) 
WHERE scheduled_change_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_schedule_id 
ON user_subscriptions(stripe_schedule_id) 
WHERE stripe_schedule_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_subscriptions.scheduled_plan_id IS 'The plan ID that will take effect after scheduled change';
COMMENT ON COLUMN user_subscriptions.scheduled_billing_cycle IS 'The billing cycle (monthly/yearly) that will take effect after scheduled change';
COMMENT ON COLUMN user_subscriptions.scheduled_change_date IS 'The date when the scheduled plan change will take effect';
COMMENT ON COLUMN user_subscriptions.stripe_schedule_id IS 'The Stripe Subscription Schedule ID for tracking scheduled changes';
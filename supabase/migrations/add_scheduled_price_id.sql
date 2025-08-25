-- Add column for tracking scheduled Stripe price ID
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS scheduled_stripe_price_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_subscriptions.scheduled_stripe_price_id IS 'The Stripe price ID that will be used when the scheduled change takes effect';
-- Add stripe_price_id column to user_subscriptions table if it doesn't exist
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_price_id 
ON user_subscriptions(stripe_price_id);

-- Update the column comment
COMMENT ON COLUMN user_subscriptions.stripe_price_id IS 'The Stripe Price ID for the current subscription';
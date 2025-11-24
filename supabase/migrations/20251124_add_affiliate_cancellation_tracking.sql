-- Add cancellation tracking to affiliate conversions
-- This allows tracking when referred customers cancel their subscriptions
-- and removes commission from affiliates' pending balance during the 30-day pending period

-- 1. Add 'cancelled' status option to affiliate_conversions
ALTER TABLE affiliate_conversions
DROP CONSTRAINT IF EXISTS affiliate_conversions_status_check;

ALTER TABLE affiliate_conversions
ADD CONSTRAINT affiliate_conversions_status_check
CHECK (status IN ('pending', 'approved', 'paid', 'refunded', 'cancelled'));

-- 2. Add cancellation tracking fields
ALTER TABLE affiliate_conversions
ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 3. Add index for quick cancellation lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_cancellation
ON affiliate_conversions(affiliate_id, status)
WHERE status = 'cancelled';

-- 4. Add comment for documentation
COMMENT ON COLUMN affiliate_conversions.cancellation_date IS 'When the referred customer cancelled their subscription';
COMMENT ON COLUMN affiliate_conversions.cancellation_reason IS 'Reason for cancellation (e.g., trial_ended, customer_cancelled, payment_failed)';

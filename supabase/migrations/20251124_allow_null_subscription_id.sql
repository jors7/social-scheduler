-- Migration: Allow NULL subscription_id in affiliate_conversions
--
-- Context: Trial signups don't have a subscription_id at the time of conversion creation.
-- The subscription_id will be populated later when the first payment occurs.
--
-- This fixes the error:
-- "null value in column "subscription_id" of relation "affiliate_conversions"
--  violates not-null constraint"

-- Make subscription_id nullable to support trial conversions
ALTER TABLE affiliate_conversions
ALTER COLUMN subscription_id DROP NOT NULL;

-- Add comment explaining why this field can be NULL
COMMENT ON COLUMN affiliate_conversions.subscription_id IS
'Subscription UUID from users table. NULL for trial conversions (not yet paid). Populated when trial converts to paid subscription.';

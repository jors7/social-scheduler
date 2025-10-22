-- Migration: Sync subscription_status and status columns
-- The table has both 'status' (used by webhooks) and 'subscription_status' (legacy admin column)
-- This causes UI bugs where webhooks update 'status' but queries read 'subscription_status'

-- Step 1: Copy all values from 'status' to 'subscription_status' to ensure they're in sync
UPDATE user_subscriptions
SET subscription_status = status
WHERE subscription_status != status OR subscription_status IS NULL;

-- Step 2: Create a trigger to keep them in sync going forward
-- This ensures any update to 'status' also updates 'subscription_status'
CREATE OR REPLACE FUNCTION sync_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When status is updated, also update subscription_status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.subscription_status = NEW.status;
  END IF;

  -- When subscription_status is updated, also update status
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    NEW.status = NEW.subscription_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS sync_subscription_status_trigger ON user_subscriptions;
CREATE TRIGGER sync_subscription_status_trigger
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_status();

-- Step 3: Verify the sync worked
-- This will show any remaining discrepancies
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM user_subscriptions
  WHERE status != subscription_status
     OR (status IS NULL AND subscription_status IS NOT NULL)
     OR (status IS NOT NULL AND subscription_status IS NULL);

  IF mismatch_count > 0 THEN
    RAISE WARNING 'Found % rows with mismatched status columns', mismatch_count;
  ELSE
    RAISE NOTICE 'Success! All status columns are now in sync. % total rows checked.',
      (SELECT COUNT(*) FROM user_subscriptions);
  END IF;
END $$;

-- Step 4: Add comment to subscription_status explaining it's deprecated
COMMENT ON COLUMN user_subscriptions.subscription_status IS
  'DEPRECATED: Use "status" column instead. This column is kept for backwards compatibility and synced via trigger.';

COMMENT ON COLUMN user_subscriptions.status IS
  'Current subscription status from Stripe: active, trialing, canceled, past_due, incomplete, etc. This is the source of truth.';

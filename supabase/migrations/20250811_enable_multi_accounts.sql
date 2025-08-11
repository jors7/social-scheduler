-- Enable Multiple Social Accounts Per Platform
-- This migration removes the unique constraint and adds support for multiple accounts

-- Drop the existing unique constraint
ALTER TABLE social_accounts 
DROP CONSTRAINT IF EXISTS social_accounts_user_id_platform_key;

-- Add new columns for multi-account support
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS account_label TEXT,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update existing accounts to have labels and be primary
UPDATE social_accounts 
SET 
  is_primary = true,
  account_label = CASE 
    WHEN username IS NOT NULL THEN username
    WHEN account_name IS NOT NULL THEN account_name
    ELSE platform || ' Account'
  END
WHERE is_primary IS NULL;

-- Create new indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_platform_active 
ON social_accounts(user_id, platform, is_active);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_primary 
ON social_accounts(user_id, is_primary) 
WHERE is_primary = true;

-- Update the RLS policies to ensure users can manage all their accounts
DROP POLICY IF EXISTS "Users can view own social accounts" ON social_accounts;
DROP POLICY IF EXISTS "Users can insert own social accounts" ON social_accounts;
DROP POLICY IF EXISTS "Users can update own social accounts" ON social_accounts;
DROP POLICY IF EXISTS "Users can delete own social accounts" ON social_accounts;

-- Recreate policies with better names
CREATE POLICY "Users can view all their social accounts" ON social_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their social accounts" ON social_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their social accounts" ON social_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their social accounts" ON social_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Function to check account limits based on subscription
CREATE OR REPLACE FUNCTION check_social_account_limit()
RETURNS TRIGGER AS $$
DECLARE
  account_count INTEGER;
  user_plan_limits JSONB;
  max_accounts INTEGER;
BEGIN
  -- Only check on insert of active accounts
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  -- Get current active account count for the user
  SELECT COUNT(*) INTO account_count
  FROM social_accounts
  WHERE user_id = NEW.user_id 
    AND is_active = true
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Get user's subscription plan limits
  SELECT sp.limits INTO user_plan_limits
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = NEW.user_id
    AND us.status IN ('active', 'trialing')
  LIMIT 1;

  -- If no subscription found, use free plan limits
  IF user_plan_limits IS NULL THEN
    SELECT limits INTO user_plan_limits
    FROM subscription_plans
    WHERE id = 'free'
    LIMIT 1;
  END IF;

  -- Extract connected_accounts limit (-1 means unlimited)
  max_accounts := COALESCE((user_plan_limits->>'connected_accounts')::INTEGER, 1);

  -- Check limit (if not unlimited)
  IF max_accounts != -1 AND account_count >= max_accounts THEN
    RAISE EXCEPTION 'Account limit reached. Your plan allows % social account(s).', max_accounts;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for account limit checking
DROP TRIGGER IF EXISTS check_social_account_limit_trigger ON social_accounts;
CREATE TRIGGER check_social_account_limit_trigger
  BEFORE INSERT OR UPDATE ON social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION check_social_account_limit();

-- Function to ensure only one primary account per platform per user
CREATE OR REPLACE FUNCTION ensure_single_primary_per_platform()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this account as primary
  IF NEW.is_primary = true THEN
    -- Unset primary for other accounts of the same platform
    UPDATE social_accounts
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND platform = NEW.platform
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain single primary account per platform
DROP TRIGGER IF EXISTS ensure_single_primary_trigger ON social_accounts;
CREATE TRIGGER ensure_single_primary_trigger
  BEFORE INSERT OR UPDATE ON social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_per_platform();

-- Add comment to table
COMMENT ON COLUMN social_accounts.account_label IS 'User-friendly label for the account (e.g., Personal, Business)';
COMMENT ON COLUMN social_accounts.is_primary IS 'Whether this is the default account for the platform';
COMMENT ON COLUMN social_accounts.display_order IS 'Order in which accounts are displayed in the UI';
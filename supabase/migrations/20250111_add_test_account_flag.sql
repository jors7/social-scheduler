-- Add is_test_account flag to social_accounts table
-- This flag indicates whether the account is a test account that can use features like reply_to_id
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT false;

-- Mark known test account as test account
UPDATE social_accounts 
SET is_test_account = true 
WHERE username = 'thejanorsula' AND platform = 'threads';

-- Add comment to column
COMMENT ON COLUMN social_accounts.is_test_account IS 'Indicates if this is a test account with additional permissions (e.g., Threads reply_to_id)';
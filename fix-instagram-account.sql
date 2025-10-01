-- Check current Instagram account state
SELECT
  id,
  username,
  platform_user_id,
  is_active,
  LEFT(access_token, 20) as token_start,
  LENGTH(access_token) as token_length,
  created_at,
  updated_at
FROM social_accounts
WHERE platform = 'instagram'
ORDER BY created_at DESC;

-- To fix: Mark the old account as inactive (safer than deleting)
-- Uncomment and run this if you want to deactivate the problematic account:
-- UPDATE social_accounts
-- SET is_active = false
-- WHERE id = '6eba1d27-05eb-4df3-8664-e8642cb2b6e3';

-- Then reconnect Instagram from the UI to create a fresh account

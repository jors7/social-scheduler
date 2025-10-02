-- Query all Instagram accounts to see what's in the database
SELECT
  id,
  user_id,
  platform,
  platform_user_id,
  username,
  is_active,
  created_at,
  updated_at,
  LENGTH(access_token) as token_length,
  SUBSTRING(access_token, 1, 10) as token_start
FROM social_accounts
WHERE platform = 'instagram'
ORDER BY created_at DESC;

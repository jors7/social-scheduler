-- Fix duplicate Instagram accounts
-- This script deactivates all Instagram accounts except the most recently updated one per user

-- Step 1: Show current Instagram accounts (for reference)
SELECT
  id,
  user_id,
  platform,
  username,
  platform_user_id,
  is_active,
  updated_at,
  created_at
FROM social_accounts
WHERE platform = 'instagram'
ORDER BY user_id, updated_at DESC;

-- Step 2: Deactivate all Instagram accounts first
UPDATE social_accounts
SET is_active = false
WHERE platform = 'instagram';

-- Step 3: Activate only the most recent Instagram account per user
WITH most_recent AS (
  SELECT DISTINCT ON (user_id)
    id,
    user_id
  FROM social_accounts
  WHERE platform = 'instagram'
  ORDER BY user_id, updated_at DESC
)
UPDATE social_accounts sa
SET is_active = true
FROM most_recent mr
WHERE sa.id = mr.id;

-- Step 4: Verify the fix - should show only one active Instagram account per user
SELECT
  id,
  user_id,
  platform,
  username,
  platform_user_id,
  is_active,
  updated_at
FROM social_accounts
WHERE platform = 'instagram'
ORDER BY user_id, is_active DESC, updated_at DESC;

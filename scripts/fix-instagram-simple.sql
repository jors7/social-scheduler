-- Simple one-query fix: Deactivate ALL Instagram accounts
-- This will force you to reconnect fresh and the callback will activate the new one

UPDATE social_accounts
SET is_active = false
WHERE platform = 'instagram';

-- Verify: Check all Instagram accounts (should all show is_active = false)
SELECT id, user_id, username, platform_user_id, is_active, updated_at
FROM social_accounts
WHERE platform = 'instagram'
ORDER BY updated_at DESC;

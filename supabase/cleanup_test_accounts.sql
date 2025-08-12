-- IMPORTANT: Review the accounts before deleting!
-- This script will help identify and remove test accounts

-- Step 1: View test accounts that would be deleted
-- (Run this first to review)
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  'Would be deleted' as action
FROM auth.users u
WHERE 
  -- Test email patterns
  (u.email LIKE '%test%@example.com' 
   OR u.email LIKE 'test%'
   OR u.email = 'user@example.com'
   OR u.email LIKE '%temp%@%')
  -- But preserve your known test account
  AND u.email NOT IN (
    'test1754602592142@example.com'  -- Keep this one if you want
  )
ORDER BY u.created_at DESC;

-- Step 2: Delete orphaned data first
-- Delete from user_subscriptions for users that don't exist
DELETE FROM user_subscriptions
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete from social_accounts for users that don't exist
DELETE FROM social_accounts
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete from scheduled_posts for users that don't exist
DELETE FROM scheduled_posts
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete from drafts for users that don't exist
DELETE FROM drafts
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 3: OPTIONAL - Delete test accounts
-- UNCOMMENT ONLY AFTER REVIEWING THE LIST ABOVE
/*
-- Delete test accounts from auth.users
DELETE FROM auth.users
WHERE 
  (email LIKE '%test%@example.com' 
   OR email LIKE 'test%'
   OR email = 'user@example.com'
   OR email LIKE '%temp%@%')
  AND email NOT IN (
    'test1754602592142@example.com'  -- Keep this one if needed
  );
*/

-- Step 4: Verify final user count
SELECT 
  'Total Users After Cleanup' as metric,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Users with Subscriptions' as metric,
  COUNT(DISTINCT user_id) as count
FROM user_subscriptions;

-- List remaining users
SELECT 
  u.id,
  u.email,
  u.created_at,
  us.role,
  us.plan_id,
  us.subscription_status
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
ORDER BY u.created_at DESC;
-- First, let's see what users we actually have
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  us.role,
  us.plan_id,
  us.subscription_status
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
ORDER BY u.created_at DESC;

-- Check for duplicate emails (shouldn't happen but let's verify)
SELECT 
  email, 
  COUNT(*) as count
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Find test accounts (common test email patterns)
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE 
  email LIKE '%test%' 
  OR email LIKE '%example.com'
  OR email LIKE '%temp%'
  OR email LIKE '%demo%'
ORDER BY created_at DESC;

-- Check users who have never logged in (possible failed signups)
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE last_sign_in_at IS NULL
ORDER BY created_at DESC;

-- Get summary of users by status
SELECT 
  CASE 
    WHEN last_sign_in_at IS NULL THEN 'Never logged in'
    WHEN last_sign_in_at < NOW() - INTERVAL '30 days' THEN 'Inactive (30+ days)'
    WHEN last_sign_in_at < NOW() - INTERVAL '7 days' THEN 'Inactive (7-30 days)'
    ELSE 'Active (< 7 days)'
  END as status,
  COUNT(*) as user_count
FROM auth.users
GROUP BY status
ORDER BY user_count DESC;

-- Your real users (non-test accounts)
SELECT 
  u.id,
  u.email,
  u.created_at,
  us.role,
  us.plan_id
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE 
  u.email IN (
    'jan.orsula1@gmail.com',
    'jan@weekhack.com', 
    'jan.weekhack@gmail.com'
  )
  OR u.email NOT LIKE '%test%'
  AND u.email NOT LIKE '%example.com'
ORDER BY u.created_at DESC;
-- 1. Direct count from auth.users
SELECT COUNT(*) as total_users FROM auth.users;

-- 2. Show ALL users with minimal filtering
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- 3. Check if there are users with NULL or empty emails
SELECT 
  COUNT(*) as users_with_null_email
FROM auth.users
WHERE email IS NULL OR email = '';

-- 4. Group users by email domain
SELECT 
  SPLIT_PART(email, '@', 2) as domain,
  COUNT(*) as count
FROM auth.users
WHERE email IS NOT NULL
GROUP BY domain
ORDER BY count DESC;

-- 5. Check for hidden/deleted users
SELECT 
  COUNT(*) as total_in_auth_users,
  COUNT(email) as with_email,
  COUNT(DISTINCT email) as unique_emails
FROM auth.users;

-- 6. Show users created in different time periods
SELECT 
  DATE(created_at) as created_date,
  COUNT(*) as users_created
FROM auth.users
GROUP BY DATE(created_at)
ORDER BY created_date DESC;

-- 7. Check if there's a difference between auth schema and public data
SELECT 
  'Auth Users' as source,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'User Subscriptions' as source,
  COUNT(DISTINCT user_id) as count
FROM user_subscriptions;

-- 8. Find users NOT in user_subscriptions table
SELECT 
  u.id,
  u.email,
  u.created_at,
  'No subscription record' as status
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE us.user_id IS NULL
ORDER BY u.created_at DESC;

-- 9. Raw dump - show first 30 users
SELECT * FROM auth.users LIMIT 30;
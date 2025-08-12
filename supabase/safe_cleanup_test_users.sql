-- SAFE CLEANUP SCRIPT - Preserves only your real accounts
-- This will delete all users EXCEPT the ones you want to keep

-- Step 1: First, let's see what will be kept (your real accounts)
SELECT 
  'WILL KEEP' as action,
  id,
  email,
  created_at
FROM auth.users
WHERE email IN (
  'jan.orsula1@gmail.com',      -- Your super admin account
  'jan@weekhack.com',            -- Your admin test account  
  'jan.weekhack@gmail.com',      -- Your test account
  'test1754602592142@example.com' -- Your test account (if you want to keep it)
)
ORDER BY created_at DESC;

-- Step 2: See what will be deleted (everything else)
SELECT 
  'WILL DELETE' as action,
  id,
  email,
  created_at
FROM auth.users
WHERE email NOT IN (
  'jan.orsula1@gmail.com',
  'jan@weekhack.com',
  'jan.weekhack@gmail.com',
  'test1754602592142@example.com'
)
ORDER BY created_at DESC;

-- Step 3: Count before cleanup
SELECT 
  'Before Cleanup - Total Users' as status,
  COUNT(*) as count
FROM auth.users;

-- Step 4: Clean up related data first (for users we're going to delete)
-- This prevents foreign key constraint errors

-- Delete social accounts for test users
DELETE FROM social_accounts
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email NOT IN (
    'jan.orsula1@gmail.com',
    'jan@weekhack.com',
    'jan.weekhack@gmail.com',
    'test1754602592142@example.com'
  )
);

-- Delete scheduled posts for test users
DELETE FROM scheduled_posts
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email NOT IN (
    'jan.orsula1@gmail.com',
    'jan@weekhack.com',
    'jan.weekhack@gmail.com',
    'test1754602592142@example.com'
  )
);

-- Delete drafts for test users
DELETE FROM drafts
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email NOT IN (
    'jan.orsula1@gmail.com',
    'jan@weekhack.com',
    'jan.weekhack@gmail.com',
    'test1754602592142@example.com'
  )
);

-- Delete user_subscriptions for test users
DELETE FROM user_subscriptions
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email NOT IN (
    'jan.orsula1@gmail.com',
    'jan@weekhack.com',
    'jan.weekhack@gmail.com',
    'test1754602592142@example.com'
  )
);

-- Delete payment history for test users
DELETE FROM payment_history
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email NOT IN (
    'jan.orsula1@gmail.com',
    'jan@weekhack.com',
    'jan.weekhack@gmail.com',
    'test1754602592142@example.com'
  )
);

-- Delete audit logs for test users (optional - you might want to keep these)
DELETE FROM admin_audit_log
WHERE admin_id IN (
  SELECT id FROM auth.users
  WHERE email NOT IN (
    'jan.orsula1@gmail.com',
    'jan@weekhack.com',
    'jan.weekhack@gmail.com',
    'test1754602592142@example.com'
  )
);

-- Step 5: THE BIG DELETE - Remove test users from auth.users
-- IMPORTANT: This will delete ALL users except the ones listed
DELETE FROM auth.users
WHERE email NOT IN (
  'jan.orsula1@gmail.com',
  'jan@weekhack.com',
  'jan.weekhack@gmail.com',
  'test1754602592142@example.com'
);

-- Step 6: Verify the cleanup worked
SELECT 
  'After Cleanup - Total Users' as status,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'After Cleanup - Super Admins' as status,
  COUNT(*) as count
FROM user_subscriptions
WHERE role = 'super_admin'
UNION ALL
SELECT 
  'After Cleanup - Regular Admins' as status,
  COUNT(*) as count
FROM user_subscriptions
WHERE role = 'admin';

-- Step 7: Show remaining users
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
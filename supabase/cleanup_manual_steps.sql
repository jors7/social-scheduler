-- ============================================================
-- MANUAL CLEANUP - RUN THESE QUERIES ONE AT A TIME
-- ============================================================
--
-- The automated scripts aren't working because of FK constraints.
-- Run these queries ONE BY ONE in order.
--
-- ⚠️  DO NOT RUN ALL AT ONCE - RUN EACH QUERY SEPARATELY
--
-- ============================================================

-- ============================================================
-- STEP 1: Find your admin user ID
-- ============================================================
-- Copy the ID from the result - you'll need it for later steps

SELECT id, email, created_at
FROM auth.users
WHERE email = 'jan.orsula1@gmail.com';

-- Result will show something like:
-- id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
-- COPY THIS ID!


-- ============================================================
-- STEP 2: Show the FK constraint details
-- ============================================================

SELECT
  tc.constraint_name,
  kcu.column_name,
  tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'auth'
  AND tc.table_name = 'users'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'users_id_fkey';

-- This shows which column causes the problem


-- ============================================================
-- STEP 3: See which users reference other users
-- ============================================================
-- Replace 'column_name' with the result from STEP 2

-- SELECT column_name, COUNT(*)
-- FROM auth.users
-- WHERE column_name IS NOT NULL
-- GROUP BY column_name;


-- ============================================================
-- STEP 4: DROP THE CONSTRAINT (run this separately)
-- ============================================================

ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Should return: ALTER TABLE


-- ============================================================
-- STEP 5: Verify constraint is dropped
-- ============================================================

SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_schema = 'auth'
  AND table_name = 'users'
  AND constraint_name = 'users_id_fkey';

-- Should return 0 rows


-- ============================================================
-- STEP 6: Delete related data (replace ADMIN_ID_HERE)
-- ============================================================
-- Replace 'ADMIN_ID_HERE' with the ID from STEP 1

DELETE FROM analytics_snapshots WHERE user_id != 'ADMIN_ID_HERE';
DELETE FROM subscription_change_log WHERE user_id != 'ADMIN_ID_HERE';
DELETE FROM payment_history WHERE user_id != 'ADMIN_ID_HERE';
DELETE FROM social_accounts WHERE user_id != 'ADMIN_ID_HERE';
DELETE FROM drafts WHERE user_id != 'ADMIN_ID_HERE';
DELETE FROM scheduled_posts WHERE user_id != 'ADMIN_ID_HERE';
DELETE FROM user_subscriptions WHERE user_id != 'ADMIN_ID_HERE';

-- Ignore errors for tables that don't exist


-- ============================================================
-- STEP 7: Delete test users (replace ADMIN_ID_HERE)
-- ============================================================

DELETE FROM auth.users WHERE id != 'ADMIN_ID_HERE';

-- Should delete ~1539 users


-- ============================================================
-- STEP 8: Verify only admin remains
-- ============================================================

SELECT COUNT(*) as total_users,
       (SELECT email FROM auth.users LIMIT 1) as remaining_user
FROM auth.users;

-- Should show: total_users = 1, remaining_user = jan.orsula1@gmail.com


-- ============================================================
-- STEP 9: Recreate the FK constraint (if needed)
-- ============================================================
-- Replace 'column_name' with result from STEP 2
-- ONLY run this if STEP 2 showed a column

-- ALTER TABLE auth.users
-- ADD CONSTRAINT users_id_fkey
-- FOREIGN KEY (column_name) REFERENCES auth.users(id);


-- ============================================================
-- DONE!
-- ============================================================

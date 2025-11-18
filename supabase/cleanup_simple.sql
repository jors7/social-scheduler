-- ============================================================
-- SIMPLE CLEANUP - NO PERMISSIONS NEEDED
-- ============================================================
--
-- Since we can't ALTER the table, we work with data only.
-- This approach NULLs the FK column for ALL users (including admin)
-- then deletes test users.
--
-- RUN THESE QUERIES ONE AT A TIME
--
-- ============================================================

-- ============================================================
-- QUERY 1: Get your admin ID
-- ============================================================

SELECT id FROM auth.users WHERE email = 'jan.orsula1@gmail.com';

-- COPY THE ID!
-- It looks like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx


-- ============================================================
-- QUERY 2: Find the FK column name
-- ============================================================

SELECT kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'auth'
  AND tc.table_name = 'users'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'users_id_fkey';

-- Remember the column name!


-- ============================================================
-- QUERY 3: NULL the FK column for ALL users
-- ============================================================
-- Replace 'COLUMN_NAME_HERE' with result from QUERY 2

-- Example if column is 'invited_by':
-- UPDATE auth.users SET invited_by = NULL;

-- Example if column is 'referred_by':
-- UPDATE auth.users SET referred_by = NULL;

-- ⚠️ UPDATE THIS WITH YOUR COLUMN NAME:
UPDATE auth.users SET COLUMN_NAME_HERE = NULL;


-- ============================================================
-- QUERY 4: Delete test users
-- ============================================================
-- Replace 'ADMIN_ID_HERE' with result from QUERY 1

DELETE FROM auth.users WHERE id != 'ADMIN_ID_HERE';


-- ============================================================
-- QUERY 5: Verify success
-- ============================================================

SELECT
  COUNT(*) as total_users,
  (SELECT email FROM auth.users LIMIT 1) as remaining_user
FROM auth.users;

-- Should show: total_users = 1


-- ============================================================
-- DONE!
-- ============================================================
-- Your database should now have only 1 user (admin)
-- ============================================================

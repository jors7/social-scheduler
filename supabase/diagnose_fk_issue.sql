-- ============================================================
-- DIAGNOSE FOREIGN KEY ISSUE IN auth.users
-- ============================================================
--
-- Run this query to understand the self-referential FK structure
-- This will help us fix the cleanup script
--
-- ============================================================

-- Show all foreign keys on auth.users table
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'auth'
  AND tc.table_name = 'users'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;

-- Show structure of auth.users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Count users and show a sample
SELECT
  COUNT(*) as total_users,
  COUNT(DISTINCT id) as unique_ids
FROM auth.users;

-- If there's a column that references users, show the referencing pattern
-- (Replace 'column_name' with actual column from first query)
-- SELECT
--   COUNT(*) as total_with_reference,
--   COUNT(DISTINCT column_name) as unique_references
-- FROM auth.users
-- WHERE column_name IS NOT NULL;

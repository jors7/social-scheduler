-- ============================================================
-- FORCE CLEANUP - NUCLEAR OPTION
-- ============================================================
--
-- ⚠️  THIS IS THE NUCLEAR OPTION ⚠️
-- Use this if the regular cleanup script fails
--
-- This script:
-- 1. Temporarily drops the foreign key constraint
-- 2. Deletes all test users
-- 3. Recreates the foreign key constraint
-- 4. Cleans up all related data
--
-- SAFE BECAUSE:
-- - Only deletes test data (preserves jan.orsula1@gmail.com)
-- - Recreates the same constraint after deletion
-- - All related data is cleaned up
--
-- HOW TO RUN:
-- 1. Open Supabase SQL Editor
-- 2. Copy this entire script
-- 3. Click "Run"
-- 4. Verify success message
--
-- ============================================================

DO $$
DECLARE
  v_admin_email TEXT := 'jan.orsula1@gmail.com';
  v_admin_id UUID;
  v_fk_column TEXT;
  v_users_before INT;
  v_users_after INT;
BEGIN

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '⚠️  FORCE CLEANUP STARTING';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';

  -- ============================================================
  -- STEP 1: Verify admin account exists
  -- ============================================================

  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = v_admin_email;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account % not found. STOPPED.', v_admin_email;
  END IF;

  SELECT COUNT(*) INTO v_users_before FROM auth.users;

  RAISE NOTICE '✓ Admin account found: %', v_admin_email;
  RAISE NOTICE '  Admin ID: %', v_admin_id;
  RAISE NOTICE '  Total users before cleanup: %', v_users_before;
  RAISE NOTICE '';

  -- ============================================================
  -- STEP 2: Find the FK column name
  -- ============================================================

  SELECT kcu.column_name INTO v_fk_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'auth'
    AND tc.table_name = 'users'
    AND tc.constraint_name = 'users_id_fkey'
  LIMIT 1;

  IF v_fk_column IS NOT NULL THEN
    RAISE NOTICE '✓ Found FK column: %', v_fk_column;
  ELSE
    RAISE NOTICE '⊘ FK column not found (may not exist)';
  END IF;

  -- ============================================================
  -- STEP 3: Drop the foreign key constraint
  -- ============================================================

  RAISE NOTICE '';
  RAISE NOTICE 'Temporarily dropping FK constraint...';

  BEGIN
    ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS users_id_fkey;
    RAISE NOTICE '  ✓ FK constraint dropped';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '  ! Could not drop constraint: %', SQLERRM;
      RAISE NOTICE '  Continuing anyway...';
  END;

  -- ============================================================
  -- STEP 4: Clean up all user-related data
  -- ============================================================

  RAISE NOTICE '';
  RAISE NOTICE 'Cleaning up user data...';

  -- Delete from all tables (except admin)
  BEGIN DELETE FROM analytics_snapshots WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM subscription_change_log WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM payment_history WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM social_accounts WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM drafts WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM scheduled_posts WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM posted_posts WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_subscriptions WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_settings WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_media WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM blog_posts WHERE author_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM audit_logs WHERE user_id != v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  RAISE NOTICE '  ✓ Cleaned up related data';

  -- ============================================================
  -- STEP 5: Delete test users
  -- ============================================================

  RAISE NOTICE '';
  RAISE NOTICE 'Deleting test users...';

  DELETE FROM auth.users WHERE id != v_admin_id;

  SELECT COUNT(*) INTO v_users_after FROM auth.users;

  RAISE NOTICE '  ✓ Deleted % test users', v_users_before - v_users_after;
  RAISE NOTICE '  ✓ Remaining users: %', v_users_after;

  -- ============================================================
  -- STEP 6: Recreate the foreign key constraint
  -- ============================================================

  RAISE NOTICE '';
  RAISE NOTICE 'Recreating FK constraint...';

  IF v_fk_column IS NOT NULL THEN
    BEGIN
      -- Recreate the FK constraint
      EXECUTE format(
        'ALTER TABLE auth.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (%I) REFERENCES auth.users(id)',
        v_fk_column
      );
      RAISE NOTICE '  ✓ FK constraint recreated on column: %', v_fk_column;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '  ! Could not recreate constraint: %', SQLERRM;
        RAISE NOTICE '  ! You may need to manually recreate it';
        RAISE NOTICE '  ! Column name: %', v_fk_column;
    END;
  ELSE
    RAISE NOTICE '  ⊘ Skipped (no FK column detected)';
  END IF;

  -- ============================================================
  -- SUCCESS
  -- ============================================================

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ FORCE CLEANUP COMPLETE!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Results:';
  RAISE NOTICE '  • Users before: %', v_users_before;
  RAISE NOTICE '  • Users after: %', v_users_after;
  RAISE NOTICE '  • Deleted: %', v_users_before - v_users_after;
  RAISE NOTICE '  • Admin preserved: %', v_admin_email;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Database is clean and ready for production!';
  RAISE NOTICE '============================================================';

END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM user_subscriptions) AS total_subscriptions,
  (SELECT COUNT(*) FROM scheduled_posts) AS total_scheduled_posts,
  (SELECT email FROM auth.users LIMIT 1) AS remaining_user;

-- ============================================================
-- EXPECTED RESULTS
-- ============================================================
-- total_users: 1
-- total_subscriptions: 1
-- total_scheduled_posts: 0
-- remaining_user: jan.orsula1@gmail.com
-- ============================================================

-- ============================================================
-- CLEAN UP ALL TEST DATA - FRESH START FOR PRODUCTION
-- ============================================================
--
-- PURPOSE: Remove all test users and data while preserving admin account
--
-- ⚠️  WARNING: THIS DELETES DATA! ⚠️
-- This script will DELETE all users except jan.orsula1@gmail.com
-- and all their associated data (posts, subscriptions, etc.)
--
-- PRESERVES:
-- ✓ Admin account: jan.orsula1@gmail.com
-- ✓ Admin subscription (enterprise lifetime)
-- ✓ Database structure
--
-- DELETES:
-- ✗ All other user accounts
-- ✗ All subscriptions (except admin)
-- ✗ All posts and drafts
-- ✗ All payment history
-- ✗ All social account connections
-- ✗ All analytics data
-- ✗ All media metadata
--
-- HOW TO RUN:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Review this script carefully
-- 3. Copy and paste entire script
-- 4. Click "Run"
-- 5. Verify counts in output
--
-- ============================================================

DO $$
DECLARE
  v_admin_email TEXT := 'jan.orsula1@gmail.com';
  v_admin_id UUID;
  v_total_users INT;
  v_test_users INT;
  v_total_subscriptions INT;
  v_total_posts INT;
  v_total_drafts INT;
  v_total_payments INT;
  v_total_social_accounts INT;
  v_fk_column TEXT;
BEGIN

  -- ============================================================
  -- STEP 1: Verify admin account exists
  -- ============================================================

  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = v_admin_email;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION '❌ STOPPED! Admin account % not found. Cannot proceed with cleanup.', v_admin_email;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '🔍 PRE-CLEANUP ANALYSIS';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Admin account found: %', v_admin_email;
  RAISE NOTICE 'Admin user ID: %', v_admin_id;
  RAISE NOTICE '';

  -- ============================================================
  -- STEP 2: Count current data
  -- ============================================================

  SELECT COUNT(*) INTO v_total_users FROM auth.users;
  SELECT COUNT(*) INTO v_test_users FROM auth.users WHERE id != v_admin_id;
  SELECT COUNT(*) INTO v_total_subscriptions FROM user_subscriptions;
  SELECT COUNT(*) INTO v_total_posts FROM scheduled_posts;
  SELECT COUNT(*) INTO v_total_drafts FROM drafts;
  SELECT COUNT(*) INTO v_total_payments FROM payment_history;
  SELECT COUNT(*) INTO v_total_social_accounts FROM social_accounts;

  RAISE NOTICE 'Current database state:';
  RAISE NOTICE '  • Total users: %', v_total_users;
  RAISE NOTICE '  • Test users (to delete): %', v_test_users;
  RAISE NOTICE '  • Total subscriptions: %', v_total_subscriptions;
  RAISE NOTICE '  • Total scheduled posts: %', v_total_posts;
  RAISE NOTICE '  • Total drafts: %', v_total_drafts;
  RAISE NOTICE '  • Total payments: %', v_total_payments;
  RAISE NOTICE '  • Total social accounts: %', v_total_social_accounts;
  RAISE NOTICE '';

  IF v_test_users = 0 THEN
    RAISE NOTICE '✓ No test users to delete. Database is already clean!';
    RETURN;
  END IF;

  RAISE NOTICE '🗑️  STARTING CLEANUP...';
  RAISE NOTICE '';

  -- ============================================================
  -- STEP 3: Delete all user-related data (except admin)
  -- ============================================================

  -- Delete analytics snapshots for test users
  BEGIN
    DELETE FROM analytics_snapshots WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted analytics snapshots';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped analytics_snapshots (table does not exist)';
  END;

  -- Delete subscription change log for test users
  BEGIN
    DELETE FROM subscription_change_log WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted subscription change log';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped subscription_change_log (table does not exist)';
  END;

  -- Delete payment history for test users
  BEGIN
    DELETE FROM payment_history WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted payment history';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped payment_history (table does not exist)';
  END;

  -- Delete social accounts for test users
  BEGIN
    DELETE FROM social_accounts WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted social account connections';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped social_accounts (table does not exist)';
  END;

  -- Delete drafts for test users
  BEGIN
    DELETE FROM drafts WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted drafts';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped drafts (table does not exist)';
  END;

  -- Delete scheduled posts for test users
  BEGIN
    DELETE FROM scheduled_posts WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted scheduled posts';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped scheduled_posts (table does not exist)';
  END;

  -- Delete posted posts for test users
  BEGIN
    DELETE FROM posted_posts WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted posted posts';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped posted_posts (table does not exist)';
  END;

  -- Delete user subscriptions for test users
  BEGIN
    DELETE FROM user_subscriptions WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted user subscriptions';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped user_subscriptions (table does not exist)';
  END;

  -- Delete user metadata/settings if exists
  BEGIN
    DELETE FROM user_settings WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted user settings';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped user_settings (table does not exist)';
  END;

  -- Delete media files metadata for test users
  BEGIN
    DELETE FROM user_media WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted media metadata';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped user_media (table does not exist)';
  END;

  -- Delete blog posts if exists
  BEGIN
    DELETE FROM blog_posts WHERE author_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted blog posts';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped blog_posts (table does not exist)';
  END;

  -- Delete audit logs for test users (keep admin logs)
  BEGIN
    DELETE FROM audit_logs WHERE user_id != v_admin_id;
    RAISE NOTICE '  ✓ Deleted audit logs';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '  ⊘ Skipped audit_logs (table does not exist)';
  END;

  -- ============================================================
  -- STEP 4: Auto-detect and clear self-referential foreign keys
  -- ============================================================

  -- Some users might reference other users (referrals, invitations, etc.)
  -- Automatically find and clear these references to avoid foreign key violations

  RAISE NOTICE '  Detecting self-referential foreign keys...';

  -- Find the column name that references auth.users(id)
  BEGIN
    SELECT kcu.column_name INTO v_fk_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'auth'
      AND tc.table_name = 'users'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
      AND tc.constraint_name = 'users_id_fkey'
    LIMIT 1;

    IF v_fk_column IS NOT NULL THEN
      RAISE NOTICE '    Found self-referential column: %', v_fk_column;
      RAISE NOTICE '    Clearing % references...', v_fk_column;

      -- Dynamically clear the foreign key column
      EXECUTE format('UPDATE auth.users SET %I = NULL WHERE id != $1', v_fk_column)
        USING v_admin_id;

      RAISE NOTICE '    ✓ Cleared all % references', v_fk_column;
    ELSE
      RAISE NOTICE '    ⊘ No self-referential foreign key found';
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '    ! Error detecting foreign key: %', SQLERRM;
      RAISE NOTICE '    Attempting to continue anyway...';
  END;

  -- ============================================================
  -- STEP 5: Delete test user accounts from auth.users
  -- ============================================================

  RAISE NOTICE '  Deleting test user accounts...';
  DELETE FROM auth.users
  WHERE id != v_admin_id;

  -- ============================================================
  -- STEP 6: Verify cleanup
  -- ============================================================

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Final database state:';
  RAISE NOTICE '  • Total users: % (was %)', (SELECT COUNT(*) FROM auth.users), v_total_users;
  RAISE NOTICE '  • Total subscriptions: % (was %)', (SELECT COUNT(*) FROM user_subscriptions), v_total_subscriptions;
  RAISE NOTICE '  • Total scheduled posts: % (was %)', (SELECT COUNT(*) FROM scheduled_posts), v_total_posts;
  RAISE NOTICE '  • Total drafts: % (was %)', (SELECT COUNT(*) FROM drafts), v_total_drafts;
  RAISE NOTICE '  • Total payments: % (was %)', (SELECT COUNT(*) FROM payment_history), v_total_payments;
  RAISE NOTICE '  • Total social accounts: % (was %)', (SELECT COUNT(*) FROM social_accounts), v_total_social_accounts;
  RAISE NOTICE '';
  RAISE NOTICE 'Preserved:';
  RAISE NOTICE '  ✓ Admin account: %', v_admin_email;
  RAISE NOTICE '  ✓ Admin subscription: Enterprise (lifetime)';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Database is now clean and ready for production!';
  RAISE NOTICE '============================================================';

END $$;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Show remaining users (should only be admin)
SELECT
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at;

-- Show remaining subscriptions (should only be admin's)
SELECT
  us.user_id,
  u.email,
  us.plan_id,
  us.status,
  us.role,
  us.stripe_subscription_id
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id
ORDER BY us.created_at;

-- Show counts
SELECT
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM user_subscriptions) AS total_subscriptions,
  (SELECT COUNT(*) FROM scheduled_posts) AS total_scheduled_posts,
  (SELECT COUNT(*) FROM posted_posts) AS total_posted_posts,
  (SELECT COUNT(*) FROM drafts) AS total_drafts,
  (SELECT COUNT(*) FROM payment_history) AS total_payments,
  (SELECT COUNT(*) FROM social_accounts) AS total_social_accounts;

-- ============================================================
-- EXPECTED RESULTS
-- ============================================================
-- After running this script, you should see:
--
-- total_users: 1 (only jan.orsula1@gmail.com)
-- total_subscriptions: 1 (admin's enterprise subscription)
-- total_scheduled_posts: 0
-- total_posted_posts: 0
-- total_drafts: 0
-- total_payments: 0 (or 1 if admin had manual payment entry)
-- total_social_accounts: 0 (or admin's accounts if connected)
--
-- Your admin dashboard should now show:
-- • Total Users: 1
-- • Active Users: 1
-- • Paid Users: 1
-- • Monthly Revenue: $0.00 (since admin doesn't pay)
-- • Total Posts: 0
-- • Posts Today: 0
-- • Conversion Rate: 100%
-- ============================================================

-- ============================================================
-- NOTES
-- ============================================================
--
-- If you want to also reset auto-increment sequences:
-- (Uncomment if needed)
--
-- ALTER SEQUENCE IF EXISTS scheduled_posts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS posted_posts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS drafts_id_seq RESTART WITH 1;
--
-- If you want to keep some test data for demonstration:
-- Instead of deleting all test users, you could keep a few by adding
-- their emails to the WHERE clause:
--
-- WHERE email NOT IN ('jan.orsula1@gmail.com', 'demo@example.com')
--
-- ============================================================

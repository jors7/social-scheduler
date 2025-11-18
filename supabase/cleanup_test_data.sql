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
  RAISE NOTICE '  Deleting analytics snapshots...';
  DELETE FROM analytics_snapshots
  WHERE user_id != v_admin_id;

  -- Delete subscription change log for test users
  RAISE NOTICE '  Deleting subscription change log...';
  DELETE FROM subscription_change_log
  WHERE user_id != v_admin_id;

  -- Delete payment history for test users
  RAISE NOTICE '  Deleting payment history...';
  DELETE FROM payment_history
  WHERE user_id != v_admin_id;

  -- Delete social accounts for test users
  RAISE NOTICE '  Deleting social account connections...';
  DELETE FROM social_accounts
  WHERE user_id != v_admin_id;

  -- Delete drafts for test users
  RAISE NOTICE '  Deleting drafts...';
  DELETE FROM drafts
  WHERE user_id != v_admin_id;

  -- Delete scheduled posts for test users
  RAISE NOTICE '  Deleting scheduled posts...';
  DELETE FROM scheduled_posts
  WHERE user_id != v_admin_id;

  -- Delete posted posts for test users
  RAISE NOTICE '  Deleting posted posts...';
  DELETE FROM posted_posts
  WHERE user_id != v_admin_id;

  -- Delete user subscriptions for test users
  RAISE NOTICE '  Deleting user subscriptions...';
  DELETE FROM user_subscriptions
  WHERE user_id != v_admin_id;

  -- Delete user metadata/settings if exists
  BEGIN
    DELETE FROM user_settings WHERE user_id != v_admin_id;
    RAISE NOTICE '  Deleting user settings...';
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, skip
      NULL;
  END;

  -- Delete media files metadata for test users
  BEGIN
    DELETE FROM user_media WHERE user_id != v_admin_id;
    RAISE NOTICE '  Deleting media metadata...';
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, skip
      NULL;
  END;

  -- Delete blog posts if exists
  BEGIN
    DELETE FROM blog_posts WHERE author_id != v_admin_id;
    RAISE NOTICE '  Deleting blog posts...';
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, skip
      NULL;
  END;

  -- Delete audit logs for test users (keep admin logs)
  BEGIN
    DELETE FROM audit_logs WHERE user_id != v_admin_id;
    RAISE NOTICE '  Deleting audit logs...';
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, skip
      NULL;
  END;

  -- ============================================================
  -- STEP 4: Delete test user accounts from auth.users
  -- ============================================================

  RAISE NOTICE '  Deleting test user accounts...';
  DELETE FROM auth.users
  WHERE id != v_admin_id;

  -- ============================================================
  -- STEP 5: Verify cleanup
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

-- ============================================================
-- CREATE LIFETIME ENTERPRISE SUBSCRIPTION FOR ADMIN USER
-- ============================================================
--
-- PURPOSE: Grant jan.orsula1@gmail.com lifetime enterprise access
-- without requiring Stripe payment
--
-- HOW TO RUN:
-- 1. Open Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run"
-- 5. Check for success message
--
-- WHAT THIS DOES:
-- - Finds the user by email
-- - Removes any existing subscription
-- - Creates a lifetime enterprise subscription (100 years)
-- - Sets super_admin role for full admin access
-- - Marks as manual grant (no Stripe)
--
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
  v_start_date TIMESTAMP WITH TIME ZONE := NOW();
  v_end_date TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '100 years';  -- Effectively lifetime
BEGIN
  -- ============================================================
  -- STEP 1: Find the user ID
  -- ============================================================
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'jan.orsula1@gmail.com';

  -- Check if user exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email jan.orsula1@gmail.com not found!';
  END IF;

  RAISE NOTICE '✓ Found user: %', v_user_id;

  -- ============================================================
  -- STEP 2: Delete any existing subscription
  -- ============================================================
  DELETE FROM user_subscriptions WHERE user_id = v_user_id;
  RAISE NOTICE '✓ Cleared existing subscription (if any)';

  -- ============================================================
  -- STEP 3: Create the lifetime enterprise subscription
  -- ============================================================
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    subscription_status,
    billing_cycle,
    current_period_start,
    current_period_end,
    trial_end,
    cancel_at,
    canceled_at,
    stripe_subscription_id,
    stripe_customer_id,
    role,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'enterprise',                    -- Enterprise plan (unlimited everything)
    'active',                        -- Active status
    'active',                        -- Subscription status (legacy, kept in sync by trigger)
    'yearly',                        -- Billing cycle (cosmetic for lifetime)
    v_start_date,                    -- Starts now
    v_end_date,                      -- Ends in 100 years (lifetime)
    NULL,                            -- No trial period
    NULL,                            -- Will never be cancelled
    NULL,                            -- Not cancelled
    NULL,                            -- No Stripe subscription (manual)
    NULL,                            -- No Stripe customer (manual)
    'super_admin',                   -- Super admin role for full access
    jsonb_build_object(
      'type', 'lifetime',
      'manual_grant', true,
      'granted_at', v_start_date,
      'reason', 'Admin account - lifetime enterprise access',
      'granted_by', 'manual_sql_script'
    ),
    v_start_date,
    v_start_date
  );

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ SUCCESS! Lifetime Enterprise Subscription Created';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Email: jan.orsula1@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Plan: Enterprise';
  RAISE NOTICE 'Status: Active';
  RAISE NOTICE 'Role: Super Admin';
  RAISE NOTICE 'Valid Until: % (100 years)', v_end_date::date;
  RAISE NOTICE '============================================================';

  -- ============================================================
  -- STEP 4: Verify the subscription was created
  -- ============================================================
  PERFORM * FROM user_subscriptions WHERE user_id = v_user_id;

  IF FOUND THEN
    RAISE NOTICE '✅ Subscription verified in database';
  ELSE
    RAISE EXCEPTION '❌ Subscription creation failed - not found in database';
  END IF;

END $$;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- This will show your new subscription details

SELECT
  us.user_id,
  u.email,
  us.plan_id AS plan,
  us.status,
  us.role,
  us.billing_cycle,
  us.current_period_start AS started_at,
  us.current_period_end AS expires_at,
  us.stripe_subscription_id AS stripe_sub_id,
  us.stripe_customer_id AS stripe_customer_id,
  us.metadata
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'jan.orsula1@gmail.com';

-- ============================================================
-- EXPECTED OUTPUT
-- ============================================================
-- You should see:
-- - plan: enterprise
-- - status: active
-- - role: super_admin
-- - expires_at: 2125-xx-xx (100 years from now)
-- - stripe_sub_id: NULL
-- - stripe_customer_id: NULL
-- - metadata: {"type": "lifetime", "manual_grant": true, ...}
-- ============================================================

-- ============================================================
-- WHAT YOU GET WITH ENTERPRISE PLAN
-- ============================================================
-- ✓ Unlimited posts per month
-- ✓ Unlimited connected accounts
-- ✓ 300 AI suggestions per month
-- ✓ Advanced analytics
-- ✓ Team features
-- ✓ Priority support
-- ✓ White label features
-- ✓ 500 MB storage
--
-- Plus super_admin role gives you:
-- ✓ Access to admin dashboard
-- ✓ View all users
-- ✓ Manage user roles
-- ✓ Access audit logs
-- ✓ Admin statistics
-- ============================================================

-- ============================================================
-- TROUBLESHOOTING
-- ============================================================
--
-- If you see "User not found":
--   → Check that jan.orsula1@gmail.com is signed up
--   → Try logging in once to create the auth.users record
--
-- If subscription doesn't show in app:
--   → Log out and log back in
--   → Clear browser cache
--   → Check /dashboard/billing page
--
-- To modify later:
--   UPDATE user_subscriptions
--   SET current_period_end = NOW() + INTERVAL '100 years'
--   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jan.orsula1@gmail.com');
--
-- To cancel (if needed):
--   UPDATE user_subscriptions
--   SET status = 'canceled', canceled_at = NOW()
--   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jan.orsula1@gmail.com');
--
-- ============================================================

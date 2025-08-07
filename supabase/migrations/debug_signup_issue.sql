-- Diagnostic script to find signup issues

-- 1. Check if user_subscriptions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_subscriptions'
) as user_subscriptions_table_exists;

-- 2. Check the structure of user_subscriptions table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- 3. Check if the trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' 
AND event_object_table = 'users';

-- 4. Check if the trigger function exists
SELECT 
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_type = 'FUNCTION';

-- 5. Check for any constraints that might be blocking
SELECT
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'user_subscriptions'
ORDER BY tc.constraint_type;

-- 6. Try to manually insert a test subscription to see what error we get
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Try to insert a test subscription
    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end
    ) VALUES (
        test_user_id,
        'free',
        'active',
        'monthly',
        NOW(),
        NOW() + INTERVAL '100 years'
    );
    
    -- If successful, delete it
    DELETE FROM user_subscriptions WHERE user_id = test_user_id;
    RAISE NOTICE 'Test insert successful - no issues with table structure';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting test subscription: %', SQLERRM;
END $$;
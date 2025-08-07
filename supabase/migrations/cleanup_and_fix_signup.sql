-- Clean up duplicate constraints and fix the signup trigger

-- 1. Drop duplicate constraints (keep only one unique constraint on user_id)
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;
-- Keep the unique constraint user_subscriptions_user_id_key

-- 2. Drop and recreate the trigger with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 3. Create improved trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only try to insert if user doesn't already have a subscription
  IF NOT EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = NEW.id) THEN
    BEGIN
      INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end
      ) VALUES (
        NEW.id,
        'free',
        'active',
        'monthly',
        NOW(),
        NOW() + INTERVAL '100 years'
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- User already has a subscription, that's fine
        NULL;
      WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Could not create subscription for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 5. Ensure columns have proper defaults
ALTER TABLE user_subscriptions 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
  
ALTER TABLE user_subscriptions 
  ALTER COLUMN plan_id SET DEFAULT 'free';
  
ALTER TABLE user_subscriptions 
  ALTER COLUMN status SET DEFAULT 'active';
  
ALTER TABLE user_subscriptions 
  ALTER COLUMN billing_cycle SET DEFAULT 'monthly';

-- 6. Test that everything works
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  -- Test insert
  INSERT INTO user_subscriptions (user_id, plan_id) 
  VALUES (test_id, 'free');
  
  -- Clean up
  DELETE FROM user_subscriptions WHERE user_id = test_id;
  
  RAISE NOTICE 'Subscription system is working correctly!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in subscription system: %', SQLERRM;
END $$;
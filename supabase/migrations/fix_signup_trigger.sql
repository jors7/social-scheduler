-- Drop the existing trigger that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a more robust version that won't fail user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use a BEGIN/EXCEPTION block to handle any errors gracefully
  BEGIN
    -- Only insert if user doesn't already have a subscription
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      billing_cycle,
      current_period_start,
      current_period_end
    ) 
    SELECT
      NEW.id,
      'free',
      'active',
      'monthly',
      NOW(),
      NOW() + INTERVAL '100 years'
    WHERE NOT EXISTS (
      SELECT 1 FROM user_subscriptions WHERE user_id = NEW.id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create subscription for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Also ensure the user_subscriptions table has proper constraints
ALTER TABLE user_subscriptions 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Make sure plan_id has a default value
ALTER TABLE user_subscriptions 
  ALTER COLUMN plan_id SET DEFAULT 'free';

-- Make sure status has a default value  
ALTER TABLE user_subscriptions 
  ALTER COLUMN status SET DEFAULT 'active';

-- Make sure billing_cycle has a default value
ALTER TABLE user_subscriptions 
  ALTER COLUMN billing_cycle SET DEFAULT 'monthly';

-- Add IF NOT EXISTS to the unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_subscriptions_user_id_key'
  ) THEN
    ALTER TABLE user_subscriptions 
      ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;
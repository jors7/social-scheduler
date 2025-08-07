-- Function to automatically create a free subscription for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a free subscription for the new user
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
    NOW() + INTERVAL '100 years' -- Free plan never expires
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update any existing users who don't have a subscription
INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  status,
  billing_cycle,
  current_period_start,
  current_period_end
)
SELECT 
  u.id,
  'free',
  'active',
  'monthly',
  NOW(),
  NOW() + INTERVAL '100 years'
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE us.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
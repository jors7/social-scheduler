-- First, check if there's an existing subscription
SELECT 
  us.*,
  au.email
FROM user_subscriptions us
RIGHT JOIN auth.users au ON us.user_id = au.id
WHERE au.email = 'YOUR_EMAIL@example.com'; -- Replace with your email

-- If no subscription exists, insert one manually
-- Replace the values below with your actual data
INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  status,
  billing_cycle,
  stripe_subscription_id,
  stripe_customer_id,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'), -- Replace with your email
  'starter', -- or 'professional', 'enterprise' based on what you purchased
  'active',
  'monthly', -- or 'yearly'
  'sub_XXXXX', -- Get this from Stripe Dashboard
  'cus_XXXXX', -- Get this from Stripe Dashboard
  NOW(),
  NOW() + INTERVAL '1 month', -- or '1 year' for yearly
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  billing_cycle = EXCLUDED.billing_cycle,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW();

-- Verify the subscription was created/updated
SELECT * FROM user_subscriptions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');
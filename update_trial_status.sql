-- Check current status for jan.weekhack@gmail.com
SELECT 
  u.email,
  us.plan_id,
  us.subscription_status,
  us.stripe_subscription_id,
  us.created_at,
  us.updated_at
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'jan.weekhack@gmail.com';

-- Update the subscription status to 'trialing' since they started a trial
UPDATE user_subscriptions 
SET subscription_status = 'trialing'
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'jan.weekhack@gmail.com'
);

-- Verify the update
SELECT 
  u.email,
  us.plan_id,
  us.subscription_status,
  us.stripe_subscription_id
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'jan.weekhack@gmail.com';
-- Check subscription plans and their limits
SELECT 
  id,
  name,
  limits
FROM subscription_plans
ORDER BY created_at;

-- Check user's current subscription
SELECT 
  us.user_id,
  us.status,
  us.plan_id,
  sp.name as plan_name,
  sp.limits
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status IN ('active', 'trialing')
LIMIT 5;
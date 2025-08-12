-- Check if billing_cycle column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions'
AND column_name LIKE '%billing%' OR column_name LIKE '%cycle%'
ORDER BY ordinal_position;

-- Check sample data
SELECT 
  user_id,
  plan_id,
  subscription_status,
  billing_cycle
FROM user_subscriptions
LIMIT 5;
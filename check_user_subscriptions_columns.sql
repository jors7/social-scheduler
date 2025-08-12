-- Check what columns exist in user_subscriptions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- Also check the actual data
SELECT * FROM user_subscriptions LIMIT 5;
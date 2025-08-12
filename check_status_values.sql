-- Check what subscription_status values actually exist in the database
SELECT DISTINCT subscription_status 
FROM user_subscriptions 
WHERE subscription_status IS NOT NULL
ORDER BY subscription_status;

-- Check the column structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
AND column_name = 'subscription_status';
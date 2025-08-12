-- Check current billing_cycle values
SELECT DISTINCT billing_cycle, COUNT(*) 
FROM user_subscriptions 
GROUP BY billing_cycle;

-- Update 'yearly' to 'annual' to match the code
UPDATE user_subscriptions 
SET billing_cycle = 'annual' 
WHERE billing_cycle = 'yearly';

-- Verify the update
SELECT DISTINCT billing_cycle, COUNT(*) 
FROM user_subscriptions 
GROUP BY billing_cycle;
EOF < /dev/null
-- Update subscription plans with correct pricing
-- Starter: $9/month, $90/year
-- Professional: $19/month, $190/year  
-- Enterprise: $29/month, $290/year

UPDATE subscription_plans 
SET 
  price_monthly = 900,  -- $9.00
  price_yearly = 9000,  -- $90.00
  features = jsonb_set(features, '{trial_days}', '7')
WHERE id = 'starter';

UPDATE subscription_plans
SET 
  price_monthly = 1900,  -- $19.00
  price_yearly = 19000,  -- $190.00
  features = jsonb_set(features, '{trial_days}', '7')
WHERE id = 'professional';

UPDATE subscription_plans
SET 
  price_monthly = 2900,  -- $29.00
  price_yearly = 29000,  -- $290.00
  features = jsonb_set(features, '{trial_days}', '7')
WHERE id = 'enterprise';

-- Ensure all paid plans have 7-day trial
UPDATE subscription_plans
SET features = jsonb_set(features, '{trial_days}', '7')
WHERE id != 'free';
-- Update subscription plan limits to match the advertised features
-- Starter: 5 social accounts
-- Professional: 15 social accounts  
-- Enterprise: Unlimited social accounts

UPDATE subscription_plans
SET 
  limits = jsonb_set(limits, '{connected_accounts}', '5')
WHERE id = 'starter';

UPDATE subscription_plans
SET 
  limits = jsonb_set(limits, '{connected_accounts}', '15')
WHERE id = 'professional';

UPDATE subscription_plans
SET 
  limits = jsonb_set(limits, '{connected_accounts}', '-1')
WHERE id = 'enterprise';

-- Also ensure the free plan has proper limits
UPDATE subscription_plans
SET 
  limits = jsonb_set(limits, '{connected_accounts}', '1')
WHERE id = 'free';
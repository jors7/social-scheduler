-- Update subscription plan limits for AI suggestions
UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '50')
WHERE id = 'starter';

UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '150')
WHERE id = 'professional';

UPDATE subscription_plans 
SET limits = jsonb_set(limits, '{ai_suggestions_per_month}', '300')
WHERE id = 'enterprise';

-- Also update features to enable AI suggestions for starter plan
UPDATE subscription_plans 
SET features = jsonb_set(features, '{ai_suggestions}', 'true')
WHERE id = 'starter';
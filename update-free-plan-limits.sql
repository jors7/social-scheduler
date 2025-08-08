-- Update free plan limits to 0 for everything
UPDATE subscription_plans 
SET limits = '{"posts_per_month": 0, "connected_accounts": 0, "ai_suggestions_per_month": 0}'::jsonb,
    features = '{"posts_per_month": 0, "platforms": 0, "analytics": false, "ai_suggestions": false, "trial_days": 0}'::jsonb
WHERE id = 'free';
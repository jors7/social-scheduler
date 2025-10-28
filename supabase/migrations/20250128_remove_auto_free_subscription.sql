-- Remove automatic free subscription creation
-- Users must now subscribe via Stripe to get access

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS handle_new_user();

-- Note: Existing users with free subscriptions will keep their access
-- This only affects NEW user signups going forward

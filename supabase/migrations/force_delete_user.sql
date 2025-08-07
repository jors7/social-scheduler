-- Force delete user by disabling triggers temporarily
-- BE CAREFUL: This forcefully removes the user

DO $$
DECLARE
  target_user_id UUID := 'e84dd065-637d-4455-b130-b07014f5183b';
BEGIN
  -- Disable triggers on auth.users temporarily
  ALTER TABLE auth.users DISABLE TRIGGER ALL;
  
  -- Delete from public schema tables
  DELETE FROM payment_history WHERE user_id = target_user_id;
  DELETE FROM social_accounts WHERE user_id = target_user_id;
  DELETE FROM scheduled_posts WHERE user_id = target_user_id;
  DELETE FROM drafts WHERE user_id = target_user_id;
  DELETE FROM user_subscriptions WHERE user_id = target_user_id;
  
  -- Delete from auth schema tables that might reference the user
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  DELETE FROM auth.mfa_amr_claims WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = target_user_id);
  
  -- Now delete the user
  DELETE FROM auth.users WHERE id = target_user_id;
  
  -- Re-enable triggers
  ALTER TABLE auth.users ENABLE TRIGGER ALL;
  
  RAISE NOTICE 'User % has been forcefully deleted', target_user_id;
END $$;
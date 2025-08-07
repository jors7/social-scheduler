-- Script to delete a user and all related data
-- Replace the user_id with the actual user ID you want to delete

DO $$
DECLARE
  target_user_id UUID := 'e84dd065-637d-4455-b130-b07014f5183b';
BEGIN
  -- Delete from all related tables first
  DELETE FROM payment_history WHERE user_id = target_user_id;
  DELETE FROM social_accounts WHERE user_id = target_user_id;
  DELETE FROM scheduled_posts WHERE user_id = target_user_id;
  DELETE FROM drafts WHERE user_id = target_user_id;
  DELETE FROM user_subscriptions WHERE user_id = target_user_id;
  
  -- Delete from any other tables that might reference the user
  -- (add more DELETE statements here if you have other tables)
  
  -- Finally delete the user from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RAISE NOTICE 'User % and all related data have been deleted', target_user_id;
END $$;
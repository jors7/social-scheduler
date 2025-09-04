-- Fix unique constraint for social_accounts to allow multiple Facebook pages
-- The old constraint only allows one account per platform, but Facebook users can have multiple pages

-- First, drop the old constraint if it exists
DO $$ 
BEGIN
  -- Check for the old constraint (user_id, platform)
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'social_accounts_user_id_platform_key'
  ) THEN
    ALTER TABLE public.social_accounts 
    DROP CONSTRAINT social_accounts_user_id_platform_key;
    RAISE NOTICE 'Dropped old unique constraint on (user_id, platform)';
  END IF;
END $$;

-- Now add the correct constraint that includes account_id
-- This allows multiple accounts per platform as long as they have different account_ids
DO $$ 
BEGIN
  -- Only add if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'social_accounts_user_id_platform_account_id_key'
  ) THEN
    ALTER TABLE public.social_accounts 
    ADD CONSTRAINT social_accounts_user_id_platform_account_id_key 
    UNIQUE(user_id, platform, account_id);
    RAISE NOTICE 'Added new unique constraint on (user_id, platform, account_id)';
  END IF;
END $$;

-- Also ensure we have the proper unique constraint from the schema
-- Drop the old one if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'social_accounts_user_id_platform_platform_user_id_key'
  ) THEN
    ALTER TABLE public.social_accounts 
    DROP CONSTRAINT social_accounts_user_id_platform_platform_user_id_key;
    RAISE NOTICE 'Dropped constraint on (user_id, platform, platform_user_id)';
  END IF;
END $$;
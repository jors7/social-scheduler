-- Add missing columns to social_accounts table for Facebook integration
-- These columns might already exist from previous migrations, so we use IF NOT EXISTS

-- Add account_label column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_accounts' 
    AND column_name = 'account_label'
  ) THEN
    ALTER TABLE public.social_accounts 
    ADD COLUMN account_label TEXT;
  END IF;
END $$;

-- Add is_primary column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_accounts' 
    AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE public.social_accounts 
    ADD COLUMN is_primary BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Ensure that we have the proper columns for Facebook integration
-- Check if we need to rename platform_user_id to account_id
DO $$ 
BEGIN
  -- If platform_user_id exists and account_id doesn't, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_accounts' 
    AND column_name = 'platform_user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_accounts' 
    AND column_name = 'account_id'
  ) THEN
    ALTER TABLE public.social_accounts 
    RENAME COLUMN platform_user_id TO account_id;
  END IF;
  
  -- If username exists and account_name doesn't, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_accounts' 
    AND column_name = 'username'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_accounts' 
    AND column_name = 'account_name'
  ) THEN
    ALTER TABLE public.social_accounts 
    RENAME COLUMN username TO account_name;
  END IF;
END $$;

-- Add account_username if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_accounts' 
    AND column_name = 'account_username'
  ) THEN
    ALTER TABLE public.social_accounts 
    ADD COLUMN account_username TEXT;
  END IF;
END $$;

-- Add access_secret if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_accounts' 
    AND column_name = 'access_secret'
  ) THEN
    ALTER TABLE public.social_accounts 
    ADD COLUMN access_secret TEXT;
  END IF;
END $$;

-- Add token_expires_at if it doesn't exist  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_accounts' 
    AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE public.social_accounts 
    ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Update any existing constraints to use the new column names
DO $$ 
BEGIN
  -- Drop old unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'social_accounts_user_id_platform_platform_user_id_key'
  ) THEN
    ALTER TABLE public.social_accounts 
    DROP CONSTRAINT social_accounts_user_id_platform_platform_user_id_key;
  END IF;
  
  -- Add new unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'social_accounts_user_id_platform_account_id_key'
  ) THEN
    ALTER TABLE public.social_accounts 
    ADD CONSTRAINT social_accounts_user_id_platform_account_id_key 
    UNIQUE(user_id, platform, account_id);
  END IF;
END $$;
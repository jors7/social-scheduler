-- Create social_accounts table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT,
  account_username TEXT,
  profile_image_url TEXT,
  access_token TEXT,
  access_secret TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable Row Level Security (only if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'social_accounts' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'social_accounts' 
    AND policyname = 'Users can view own social accounts'
  ) THEN
    CREATE POLICY "Users can view own social accounts" ON social_accounts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'social_accounts' 
    AND policyname = 'Users can insert own social accounts'
  ) THEN
    CREATE POLICY "Users can insert own social accounts" ON social_accounts
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'social_accounts' 
    AND policyname = 'Users can update own social accounts'
  ) THEN
    CREATE POLICY "Users can update own social accounts" ON social_accounts
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'social_accounts' 
    AND policyname = 'Users can delete own social accounts'
  ) THEN
    CREATE POLICY "Users can delete own social accounts" ON social_accounts
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
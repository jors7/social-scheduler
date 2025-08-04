-- Create social_accounts table
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

-- Enable Row Level Security
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own social accounts
CREATE POLICY "Users can view own social accounts" ON social_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own social accounts
CREATE POLICY "Users can insert own social accounts" ON social_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own social accounts
CREATE POLICY "Users can update own social accounts" ON social_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own social accounts
CREATE POLICY "Users can delete own social accounts" ON social_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create index on user_id for faster queries
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);

-- Create index on platform for faster queries
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
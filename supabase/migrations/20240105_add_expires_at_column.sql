-- Add expires_at column to social_accounts table for token expiration tracking
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
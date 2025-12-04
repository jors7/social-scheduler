-- Add user_email column to support_conversations for easy access
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Update existing conversations with user emails (if any exist)
-- This uses auth.users which requires admin access, so run this in Supabase SQL editor
UPDATE support_conversations sc
SET user_email = (
  SELECT email FROM auth.users WHERE id = sc.user_id
)
WHERE user_email IS NULL;

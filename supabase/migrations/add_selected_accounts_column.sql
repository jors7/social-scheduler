-- Add selected_accounts column for multi-account selection
-- This stores which specific accounts were selected for each platform
-- Format: { "facebook": ["account-id-1"], "instagram": ["account-id-2", "account-id-3"] }

-- Add the selected_accounts column
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS selected_accounts JSONB;

-- Comment explaining the structure
COMMENT ON COLUMN scheduled_posts.selected_accounts IS 'Stores which specific account IDs were selected for each platform. Format: { "platform": ["account-id", ...] }';

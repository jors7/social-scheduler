-- Migration: Create post idempotency tracking table
-- Prevents duplicate posts when retry happens after DB failure

CREATE TABLE IF NOT EXISTS post_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL,
  platform TEXT NOT NULL,
  account_id UUID NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL, -- Hash of (post_id + platform + account_id)
  status TEXT NOT NULL DEFAULT 'pending', -- pending, posting, posted, failed
  platform_post_id TEXT, -- The ID returned by the platform if successful
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups by idempotency key
CREATE INDEX IF NOT EXISTS idx_post_attempts_idempotency_key
  ON post_attempts(idempotency_key);

-- Index for lookups by scheduled post
CREATE INDEX IF NOT EXISTS idx_post_attempts_scheduled_post
  ON post_attempts(scheduled_post_id);

-- Cleanup old entries (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_post_attempts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM post_attempts
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Enable RLS
ALTER TABLE post_attempts ENABLE ROW LEVEL SECURITY;

-- Service role can insert/update/select post attempts
CREATE POLICY "Service role can manage post attempts" ON post_attempts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON post_attempts TO service_role;

COMMENT ON TABLE post_attempts IS 'Idempotency tracking to prevent duplicate posts during retries';

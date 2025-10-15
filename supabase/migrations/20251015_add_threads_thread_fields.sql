-- Add Threads thread mode support to scheduled_posts table
ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS threads_mode TEXT,
  ADD COLUMN IF NOT EXISTS thread_posts JSONB,
  ADD COLUMN IF NOT EXISTS threads_thread_media JSONB;

-- Add comment for documentation
COMMENT ON COLUMN scheduled_posts.threads_mode IS 'Threads posting mode: "single" or "thread"';
COMMENT ON COLUMN scheduled_posts.thread_posts IS 'Array of text content for each post in a thread';
COMMENT ON COLUMN scheduled_posts.threads_thread_media IS 'Array of media URLs for each post in a thread';

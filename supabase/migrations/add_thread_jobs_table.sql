-- Create thread_jobs table for queue-based Threads thread processing
-- This allows us to bypass Vercel's 60s timeout by processing posts sequentially via QStash

CREATE TABLE IF NOT EXISTS thread_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE SET NULL,
  account_id UUID NOT NULL, -- Social account ID for Threads

  -- Job status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Thread data
  posts JSONB NOT NULL, -- Array of post texts: ["First post", "Second post", ...]
  media_urls JSONB, -- Array of media URL arrays: [[{url, type, thumbnailUrl}], [{url}], ...]

  -- Progress tracking
  published_post_ids JSONB DEFAULT '[]'::jsonb, -- Array of published Threads post IDs
  current_index INTEGER DEFAULT 0, -- Index of next post to process

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_thread_jobs_user_id ON thread_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_jobs_status ON thread_jobs(status);
CREATE INDEX IF NOT EXISTS idx_thread_jobs_scheduled_post ON thread_jobs(scheduled_post_id);
CREATE INDEX IF NOT EXISTS idx_thread_jobs_created_at ON thread_jobs(created_at);

-- Enable Row Level Security
ALTER TABLE thread_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own thread jobs
CREATE POLICY "Users can view own thread jobs"
  ON thread_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own thread jobs
CREATE POLICY "Users can create own thread jobs"
  ON thread_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update any thread job (for QStash webhook)
CREATE POLICY "Service role can update thread jobs"
  ON thread_jobs FOR UPDATE
  USING (true); -- Service role bypasses RLS

-- Service role can delete thread jobs (for cleanup)
CREATE POLICY "Service role can delete thread jobs"
  ON thread_jobs FOR DELETE
  USING (true); -- Service role bypasses RLS

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_thread_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER thread_jobs_updated_at
  BEFORE UPDATE ON thread_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_jobs_updated_at();

-- Add comment for documentation
COMMENT ON TABLE thread_jobs IS 'Queue-based processing for Threads threads to bypass Vercel 60s timeout limit';
COMMENT ON COLUMN thread_jobs.posts IS 'Array of post texts in order';
COMMENT ON COLUMN thread_jobs.media_urls IS 'Array of media arrays, one per post. Each post can have multiple media items.';
COMMENT ON COLUMN thread_jobs.published_post_ids IS 'Array of Threads post IDs that have been successfully published';
COMMENT ON COLUMN thread_jobs.current_index IS 'Index of the next post to process (0-based)';

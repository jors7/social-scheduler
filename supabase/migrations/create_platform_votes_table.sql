-- Create platform_votes table to track individual user votes
CREATE TABLE IF NOT EXISTS platform_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform_name)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_votes_user_id ON platform_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_votes_platform_name ON platform_votes(platform_name);

-- Enable Row Level Security
ALTER TABLE platform_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own votes
CREATE POLICY "Users can view their own votes"
  ON platform_votes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own votes
CREATE POLICY "Users can create their own votes"
  ON platform_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users cannot delete votes (permanent tracking)
-- No DELETE policy = no one can delete

-- Add comment
COMMENT ON TABLE platform_votes IS 'Tracks individual user votes for platform requests to prevent duplicate voting';

-- Create analytics_snapshots table for historical metrics tracking
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'threads', 'tiktok', 'pinterest', 'bluesky')),
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metrics JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, account_id, snapshot_date)
);

-- Create index for efficient queries
CREATE INDEX idx_snapshots_user_platform ON analytics_snapshots(user_id, platform, account_id, snapshot_date DESC);

-- Create index for date-based queries
CREATE INDEX idx_snapshots_date ON analytics_snapshots(snapshot_date DESC);

-- Enable Row Level Security
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own snapshots
CREATE POLICY "Users can view their own analytics snapshots"
  ON analytics_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own snapshots
CREATE POLICY "Users can insert their own analytics snapshots"
  ON analytics_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own snapshots
CREATE POLICY "Users can update their own analytics snapshots"
  ON analytics_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own snapshots
CREATE POLICY "Users can delete their own analytics snapshots"
  ON analytics_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analytics_snapshots_updated_at
  BEFORE UPDATE ON analytics_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_snapshots_updated_at();

-- Add comment to table
COMMENT ON TABLE analytics_snapshots IS 'Stores daily snapshots of social media analytics for historical comparison';
COMMENT ON COLUMN analytics_snapshots.metrics IS 'Platform-specific metrics stored as JSONB for flexibility';
COMMENT ON COLUMN analytics_snapshots.snapshot_date IS 'The date this snapshot represents (not necessarily when it was created)';

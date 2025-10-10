-- Create analytics_snapshots table for historical trend tracking
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_posts INTEGER NOT NULL DEFAULT 0,
  total_engagement INTEGER NOT NULL DEFAULT 0,
  total_reach INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  engagement_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  platform_stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_user_date
  ON analytics_snapshots(user_id, snapshot_date DESC);

-- Enable Row Level Security
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own snapshots"
  ON analytics_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON analytics_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
  ON analytics_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to get or create today's snapshot
CREATE OR REPLACE FUNCTION get_or_create_snapshot(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  snapshot_id UUID;
BEGIN
  -- Try to get today's snapshot
  SELECT id INTO snapshot_id
  FROM analytics_snapshots
  WHERE user_id = user_uuid
    AND snapshot_date = CURRENT_DATE;

  -- If not found, create it
  IF snapshot_id IS NULL THEN
    INSERT INTO analytics_snapshots (user_id, snapshot_date)
    VALUES (user_uuid, CURRENT_DATE)
    RETURNING id INTO snapshot_id;
  END IF;

  RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_or_create_snapshot(UUID) TO authenticated;

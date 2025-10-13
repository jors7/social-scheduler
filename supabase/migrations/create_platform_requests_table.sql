-- Create platform_requests table
CREATE TABLE IF NOT EXISTS platform_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL,
  vote_count INTEGER DEFAULT 1,
  is_custom BOOLEAN DEFAULT false,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_requests_platform_name ON platform_requests(platform_name);
CREATE INDEX IF NOT EXISTS idx_platform_requests_vote_count ON platform_requests(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_platform_requests_is_custom ON platform_requests(is_custom);

-- Enable Row Level Security
ALTER TABLE platform_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read platform requests
CREATE POLICY "Anyone can view platform requests"
  ON platform_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert platform requests
CREATE POLICY "Users can create platform requests"
  ON platform_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requested_by);

-- Policy: Authenticated users can update vote counts (for the vote endpoint)
CREATE POLICY "Users can update platform requests"
  ON platform_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_platform_requests_updated_at
  BEFORE UPDATE ON platform_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add some initial seed data (optional - commented out)
-- INSERT INTO platform_requests (platform_name, vote_count, is_custom, requested_by)
-- VALUES
--   ('Reddit', 5, false, NULL),
--   ('Snapchat', 3, false, NULL),
--   ('Discord', 2, false, NULL)
-- ON CONFLICT (platform_name) DO NOTHING;

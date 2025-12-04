-- Create table for tracking help center search queries
CREATE TABLE IF NOT EXISTS help_center_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  had_ai_answer BOOLEAN DEFAULT FALSE,
  source_article_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_help_center_searches_created_at ON help_center_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_center_searches_query ON help_center_searches(query);
CREATE INDEX IF NOT EXISTS idx_help_center_searches_user_id ON help_center_searches(user_id);

-- Enable RLS
ALTER TABLE help_center_searches ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can insert (from API)
CREATE POLICY "Service role can insert help center searches"
  ON help_center_searches
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Service role can select all
CREATE POLICY "Service role can select help center searches"
  ON help_center_searches
  FOR SELECT
  TO service_role
  USING (true);

-- Policy: Admins can view all searches
CREATE POLICY "Admins can view help center searches"
  ON help_center_searches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Policy: Allow anonymous inserts for unauthenticated users
CREATE POLICY "Allow anonymous inserts"
  ON help_center_searches
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Authenticated users can insert their own searches
CREATE POLICY "Authenticated users can insert searches"
  ON help_center_searches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

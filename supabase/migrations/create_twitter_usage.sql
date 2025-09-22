-- Create twitter_usage table for tracking daily Twitter API usage
CREATE TABLE IF NOT EXISTS twitter_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id TEXT NOT NULL,
  content_preview TEXT,
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster daily queries
CREATE INDEX idx_twitter_usage_posted_at ON twitter_usage(posted_at);
CREATE INDEX idx_twitter_usage_user_id ON twitter_usage(user_id);

-- Enable RLS
ALTER TABLE twitter_usage ENABLE ROW LEVEL SECURITY;

-- Admin users can see all Twitter usage
CREATE POLICY "Admin users can view all Twitter usage" ON twitter_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Service role can insert Twitter usage
CREATE POLICY "Service role can insert Twitter usage" ON twitter_usage
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to get daily Twitter usage stats
CREATE OR REPLACE FUNCTION get_twitter_usage_stats(
  check_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  used_today INTEGER,
  remaining_today INTEGER,
  posts_today JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as used_today,
    GREATEST(0, 17 - COUNT(*))::INTEGER as remaining_today,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'user_id', user_id,
          'post_id', post_id,
          'content_preview', content_preview,
          'posted_at', posted_at
        ) ORDER BY posted_at DESC
      ) FILTER (WHERE id IS NOT NULL),
      '[]'::jsonb
    ) as posts_today
  FROM twitter_usage
  WHERE DATE(posted_at) = check_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if Twitter posting is allowed (under daily limit)
CREATE OR REPLACE FUNCTION can_post_to_twitter() RETURNS BOOLEAN AS $$
DECLARE
  posts_today INTEGER;
BEGIN
  SELECT COUNT(*) INTO posts_today
  FROM twitter_usage
  WHERE DATE(posted_at) = CURRENT_DATE;
  
  RETURN posts_today < 17;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_twitter_usage_stats(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION can_post_to_twitter() TO authenticated, service_role;
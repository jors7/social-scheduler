-- LinkedIn Analytics Schema
-- This migration adds support for storing LinkedIn post analytics data

-- ============================================================================
-- Table: linkedin_analytics
-- Purpose: Store historical analytics data for LinkedIn posts
-- ============================================================================
CREATE TABLE IF NOT EXISTS linkedin_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE NOT NULL,

  -- Post identification
  post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  post_urn TEXT NOT NULL, -- LinkedIn URN (e.g., urn:li:ugcPost:123456789)

  -- Analytics metrics
  impressions INTEGER DEFAULT 0,
  members_reached INTEGER DEFAULT 0,
  reshares INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,

  -- Engagement calculations
  engagement_rate DECIMAL(5,2), -- Calculated: (reactions + comments + reshares) / impressions * 100

  -- Timestamps
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  post_created_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for better query performance
  CONSTRAINT unique_analytics_fetch UNIQUE(post_urn, fetched_at)
);

-- Add index on user_id for fast user queries
CREATE INDEX IF NOT EXISTS idx_linkedin_analytics_user_id
ON linkedin_analytics(user_id);

-- Add index on account_id for account-specific queries
CREATE INDEX IF NOT EXISTS idx_linkedin_analytics_account_id
ON linkedin_analytics(account_id);

-- Add index on post_urn for lookup
CREATE INDEX IF NOT EXISTS idx_linkedin_analytics_post_urn
ON linkedin_analytics(post_urn);

-- Add index on fetched_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_linkedin_analytics_fetched_at
ON linkedin_analytics(fetched_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE linkedin_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only view their own analytics
CREATE POLICY "Users can view own LinkedIn analytics"
  ON linkedin_analytics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own analytics
CREATE POLICY "Users can insert own LinkedIn analytics"
  ON linkedin_analytics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analytics
CREATE POLICY "Users can update own LinkedIn analytics"
  ON linkedin_analytics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own analytics
CREATE POLICY "Users can delete own LinkedIn analytics"
  ON linkedin_analytics
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Function: Calculate Engagement Rate
-- Purpose: Automatically calculate engagement rate when metrics are updated
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_linkedin_engagement_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate engagement rate: (reactions + comments + reshares) / impressions * 100
  IF NEW.impressions > 0 THEN
    NEW.engagement_rate := ROUND(
      ((NEW.reactions + NEW.comments + NEW.reshares)::DECIMAL / NEW.impressions * 100),
      2
    );
  ELSE
    NEW.engagement_rate := 0;
  END IF;

  -- Update the updated_at timestamp
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate engagement rate
CREATE TRIGGER linkedin_analytics_engagement_rate
  BEFORE INSERT OR UPDATE ON linkedin_analytics
  FOR EACH ROW
  EXECUTE FUNCTION calculate_linkedin_engagement_rate();

-- ============================================================================
-- Function: Get LinkedIn Analytics Summary
-- Purpose: Retrieve aggregated analytics for a user or specific time period
-- ============================================================================
CREATE OR REPLACE FUNCTION get_linkedin_analytics_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_posts BIGINT,
  total_impressions BIGINT,
  total_reach BIGINT,
  total_reactions BIGINT,
  total_comments BIGINT,
  total_reshares BIGINT,
  avg_engagement_rate DECIMAL,
  top_post_urn TEXT,
  top_post_impressions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_analytics AS (
    SELECT DISTINCT ON (post_urn)
      post_urn,
      impressions,
      members_reached,
      reactions,
      comments,
      reshares,
      engagement_rate,
      fetched_at
    FROM linkedin_analytics
    WHERE user_id = p_user_id
      AND fetched_at >= NOW() - (p_days || ' days')::INTERVAL
    ORDER BY post_urn, fetched_at DESC
  ),
  aggregated AS (
    SELECT
      COUNT(DISTINCT post_urn) as post_count,
      SUM(impressions) as sum_impressions,
      SUM(members_reached) as sum_reach,
      SUM(reactions) as sum_reactions,
      SUM(comments) as sum_comments,
      SUM(reshares) as sum_reshares,
      AVG(engagement_rate) as avg_rate
    FROM recent_analytics
  ),
  top_post AS (
    SELECT
      post_urn,
      impressions
    FROM recent_analytics
    ORDER BY impressions DESC
    LIMIT 1
  )
  SELECT
    a.post_count,
    a.sum_impressions,
    a.sum_reach,
    a.sum_reactions,
    a.sum_comments,
    a.sum_reshares,
    ROUND(a.avg_rate, 2),
    t.post_urn,
    t.impressions
  FROM aggregated a
  CROSS JOIN top_post t;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Table: linkedin_api_quota
-- Purpose: Track LinkedIn API usage to avoid rate limits
-- ============================================================================
CREATE TABLE IF NOT EXISTS linkedin_api_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE NOT NULL,

  -- API endpoint tracking
  endpoint TEXT NOT NULL, -- e.g., 'memberCreatorPostAnalytics'
  request_count INTEGER DEFAULT 0,

  -- Time window
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_end TIMESTAMP WITH TIME ZONE,

  -- Rate limit info
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint per user/endpoint/window
  CONSTRAINT unique_api_quota UNIQUE(user_id, account_id, endpoint, window_start)
);

-- Enable RLS
ALTER TABLE linkedin_api_quota ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own API quota"
  ON linkedin_api_quota
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own API quota"
  ON linkedin_api_quota
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE linkedin_analytics IS 'Stores historical LinkedIn post analytics data from the Community Management API';
COMMENT ON COLUMN linkedin_analytics.post_urn IS 'LinkedIn post URN in format: urn:li:ugcPost:123456789 or urn:li:share:123456789';
COMMENT ON COLUMN linkedin_analytics.impressions IS 'Total number of times the post was viewed';
COMMENT ON COLUMN linkedin_analytics.members_reached IS 'Unique LinkedIn members who viewed the post';
COMMENT ON COLUMN linkedin_analytics.engagement_rate IS 'Calculated as (reactions + comments + reshares) / impressions * 100';

COMMENT ON FUNCTION get_linkedin_analytics_summary IS 'Returns aggregated LinkedIn analytics for a user within a specified time period';

-- ============================================================================
-- Grant permissions
-- ============================================================================
-- Allow authenticated users to execute the summary function
GRANT EXECUTE ON FUNCTION get_linkedin_analytics_summary(UUID, INTEGER) TO authenticated;

-- Create api_alerts table for tracking sent alerts and deduplication
-- This table stores records of API monitoring alerts to prevent duplicate notifications

CREATE TABLE IF NOT EXISTS api_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id TEXT NOT NULL,           -- Unique identifier for the issue (for deduplication)
  platform TEXT NOT NULL,           -- Platform name (instagram, facebook, etc.)
  severity TEXT NOT NULL,           -- 'warning', 'error', 'critical'
  issue_type TEXT NOT NULL,         -- 'deprecation_warning', 'unexpected_response', etc.
  message TEXT NOT NULL,            -- Human-readable description of the issue
  details JSONB,                    -- Additional context about the issue
  recommended_action TEXT,          -- Suggested action to resolve the issue
  alerted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,  -- For deduplication window
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for duplicate checking (issue_id + time window)
CREATE INDEX IF NOT EXISTS idx_api_alerts_issue_id_time
ON api_alerts(issue_id, alerted_at);

-- Index for platform filtering
CREATE INDEX IF NOT EXISTS idx_api_alerts_platform
ON api_alerts(platform);

-- Index for severity filtering (useful for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_api_alerts_severity
ON api_alerts(severity);

-- Index for cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_api_alerts_expires_at
ON api_alerts(expires_at);

-- Add comment to table
COMMENT ON TABLE api_alerts IS 'Stores API monitoring alerts for admin notification and deduplication';
COMMENT ON COLUMN api_alerts.issue_id IS 'Unique identifier for deduplication - same issue_id within 24h window is deduplicated';
COMMENT ON COLUMN api_alerts.expires_at IS 'After this time, alert can be sent again for same issue_id';

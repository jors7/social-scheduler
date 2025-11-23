-- Feature Requests System Migration
-- Created: 2025-01-23
-- Description: Complete feature request system with voting, notifications, and admin management

-- ============================================================================
-- TABLES
-- ============================================================================

-- Feature Requests Table
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  description TEXT CHECK (char_length(description) <= 1000),
  category TEXT NOT NULL CHECK (category IN ('analytics', 'posting', 'ui_ux', 'integration', 'automation', 'collaboration', 'ai_features', 'mobile', 'other')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'planned', 'in_progress', 'completed', 'declined')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  vote_count INTEGER NOT NULL DEFAULT 1,
  is_custom BOOLEAN NOT NULL DEFAULT true,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Feature Votes Table (prevent duplicate voting)
CREATE TABLE IF NOT EXISTS feature_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature_request_id)
);

-- Feature Notifications Table (in-app notifications)
CREATE TABLE IF NOT EXISTS feature_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_vote_count ON feature_requests(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_votes_user_id ON feature_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_votes_feature_id ON feature_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_notifications_user_id ON feature_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_notifications_is_read ON feature_notifications(is_read);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_notifications ENABLE ROW LEVEL SECURITY;

-- Feature Requests Policies
-- Anyone authenticated can view all feature requests
CREATE POLICY "Anyone can view feature requests"
  ON feature_requests FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create feature requests
CREATE POLICY "Authenticated users can create feature requests"
  ON feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requested_by);

-- Only admins can update feature requests (status, priority, admin_notes)
CREATE POLICY "Admins can update feature requests"
  ON feature_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only super admins can delete feature requests
CREATE POLICY "Super admins can delete feature requests"
  ON feature_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Feature Votes Policies
-- Users can view all votes (needed to show vote counts)
CREATE POLICY "Anyone can view feature votes"
  ON feature_votes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can insert their own votes"
  ON feature_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes (to allow unvoting)
CREATE POLICY "Users can delete their own votes"
  ON feature_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Feature Notifications Policies
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON feature_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON feature_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON feature_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- System/admins can insert notifications
CREATE POLICY "System can insert notifications"
  ON feature_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER feature_request_updated_at
  BEFORE UPDATE ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_request_updated_at();

-- Function to increment vote count when a vote is added
CREATE OR REPLACE FUNCTION increment_feature_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE feature_requests
  SET vote_count = vote_count + 1,
      updated_at = NOW()
  WHERE id = NEW.feature_request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment vote count
CREATE TRIGGER feature_vote_increment
  AFTER INSERT ON feature_votes
  FOR EACH ROW
  EXECUTE FUNCTION increment_feature_vote_count();

-- Function to decrement vote count when a vote is removed
CREATE OR REPLACE FUNCTION decrement_feature_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE feature_requests
  SET vote_count = GREATEST(vote_count - 1, 0),
      updated_at = NOW()
  WHERE id = OLD.feature_request_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to decrement vote count
CREATE TRIGGER feature_vote_decrement
  AFTER DELETE ON feature_votes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_feature_vote_count();

-- Function to create notifications when feature status changes
CREATE OR REPLACE FUNCTION notify_feature_status_change()
RETURNS TRIGGER AS $$
DECLARE
  voter_id UUID;
  status_message TEXT;
BEGIN
  -- Only create notifications if status changed
  IF NEW.status != OLD.status THEN
    -- Create appropriate message based on status
    status_message := CASE NEW.status
      WHEN 'under_review' THEN 'A feature you voted for is now under review: ' || NEW.title
      WHEN 'planned' THEN 'Good news! A feature you voted for has been planned: ' || NEW.title
      WHEN 'in_progress' THEN 'A feature you voted for is now in development: ' || NEW.title
      WHEN 'completed' THEN 'A feature you voted for has been completed! ' || NEW.title
      WHEN 'declined' THEN 'A feature you voted for has been declined: ' || NEW.title
      ELSE 'Status update for: ' || NEW.title
    END;

    -- Create notification for all users who voted (except admins who made the change)
    FOR voter_id IN
      SELECT DISTINCT user_id
      FROM feature_votes
      WHERE feature_request_id = NEW.id
      AND user_id != auth.uid()
    LOOP
      INSERT INTO feature_notifications (user_id, feature_request_id, message)
      VALUES (voter_id, NEW.id, status_message);
    END LOOP;

    -- Also notify the original requester if they exist and didn't vote
    IF NEW.requested_by IS NOT NULL
      AND NEW.requested_by != auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM feature_votes
        WHERE feature_request_id = NEW.id
        AND user_id = NEW.requested_by
      )
    THEN
      INSERT INTO feature_notifications (user_id, feature_request_id, message)
      VALUES (NEW.requested_by, NEW.id, status_message);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notifications on status change
CREATE TRIGGER feature_status_change_notification
  AFTER UPDATE ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_feature_status_change();

-- ============================================================================
-- SEED DATA - Pre-suggested Features
-- ============================================================================

-- Insert pre-suggested features (is_custom = false)
INSERT INTO feature_requests (title, description, category, status, is_custom, vote_count, requested_by)
VALUES
  ('Post Performance Predictions', 'AI-powered predictions for best posting times and expected engagement based on historical data', 'ai_features', 'submitted', false, 0, NULL),
  ('Content Recycling & Evergreen Posts', 'Automatically repost top-performing content at optimal times with customizable intervals for evergreen content strategies', 'automation', 'submitted', false, 0, NULL),
  ('Social Listening & Keyword Monitoring', 'Track brand mentions, keywords, and trending topics across social platforms to inform content strategy', 'analytics', 'submitted', false, 0, NULL),
  ('Hashtag Analytics', 'Track hashtag performance across platforms with trending suggestions and reach metrics', 'analytics', 'submitted', false, 0, NULL),
  ('Mobile App', 'Native iOS and Android applications for posting and managing content on the go', 'mobile', 'submitted', false, 0, NULL),
  ('Automated Reporting & Export', 'Schedule automated PDF/Excel reports with analytics delivered weekly/monthly via email', 'analytics', 'submitted', false, 0, NULL),
  ('Competitor Analysis', 'Track and analyze competitor social media activity, posting patterns, and engagement', 'analytics', 'submitted', false, 0, NULL),
  ('Team Approval Workflow', 'Require team member approval before scheduled posts go live with comment threads', 'collaboration', 'submitted', false, 0, NULL),
  ('Dark Mode', 'Full dark mode support across the entire application for better viewing at night', 'ui_ux', 'submitted', false, 0, NULL),
  ('Advanced Analytics Dashboard', 'Detailed insights including engagement trends, best posting times, audience demographics', 'analytics', 'submitted', false, 0, NULL)
ON CONFLICT DO NOTHING;

-- Insert completed features (already implemented in the app)
INSERT INTO feature_requests (title, description, category, status, is_custom, vote_count, requested_by, completed_at)
VALUES
  ('Bulk Post Scheduling', 'Upload CSV file to schedule multiple posts at once with drag-and-drop calendar integration', 'posting', 'completed', false, 0, NULL, '2025-01-15 00:00:00+00'),
  ('Content Calendar View', 'Visual drag-and-drop calendar for managing and rescheduling posts across all platforms', 'posting', 'completed', false, 0, NULL, '2025-01-18 00:00:00+00'),
  ('Post Templates Library', 'Save and reuse post templates with custom placeholders for faster content creation', 'posting', 'completed', false, 0, NULL, '2025-01-10 00:00:00+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE feature_requests IS 'Stores user feature requests and their status';
COMMENT ON TABLE feature_votes IS 'Tracks user votes on feature requests (prevents duplicate voting)';
COMMENT ON TABLE feature_notifications IS 'In-app notifications for feature status changes';
COMMENT ON COLUMN feature_requests.is_custom IS 'true = user submitted, false = pre-suggested by admin';
COMMENT ON COLUMN feature_requests.priority IS 'Admin-set priority level for internal planning';
COMMENT ON COLUMN feature_requests.admin_notes IS 'Internal notes for admins (not visible to users)';

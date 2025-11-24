-- Update Script for Existing Feature Requests Database
-- Run this if you've already applied the main migration
-- Created: 2025-01-23
-- Purpose: Replace implemented features with new ones and mark completed features

-- ============================================================================
-- STEP 1: Delete old pre-suggested features that are now implemented
-- ============================================================================

DELETE FROM feature_requests
WHERE is_custom = false
AND title IN (
  'Bulk Post Scheduling',
  'Content Calendar View',
  'Post Templates Library'
);

-- ============================================================================
-- STEP 2: Insert new pre-suggested features
-- ============================================================================

INSERT INTO feature_requests (title, description, category, status, is_custom, vote_count, requested_by)
VALUES
  ('Content Recycling & Evergreen Posts', 'Automatically repost top-performing content at optimal times with customizable intervals for evergreen content strategies', 'automation', 'submitted', false, 0, NULL),
  ('Social Listening & Keyword Monitoring', 'Track brand mentions, keywords, and trending topics across social platforms to inform content strategy', 'analytics', 'submitted', false, 0, NULL),
  ('Automated Reporting & Export', 'Schedule automated PDF/Excel reports with analytics delivered weekly/monthly via email', 'analytics', 'submitted', false, 0, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Insert completed features (for roadmap "Recently Completed" section)
-- ============================================================================

INSERT INTO feature_requests (title, description, category, status, is_custom, vote_count, requested_by, completed_at)
VALUES
  ('Bulk Post Scheduling', 'Upload CSV file to schedule multiple posts at once with drag-and-drop calendar integration', 'posting', 'completed', false, 0, NULL, '2025-10-24 00:00:00+00'),
  ('Content Calendar View', 'Visual drag-and-drop calendar for managing and rescheduling posts across all platforms', 'posting', 'completed', false, 0, NULL, '2025-10-05 00:00:00+00'),
  ('Post Templates Library', 'Save and reuse post templates with custom placeholders for faster content creation', 'posting', 'completed', false, 0, NULL, '2025-11-02 00:00:00+00'),
  ('Affiliate Program', 'Complete referral program with 30% recurring commissions, automatic tracking, affiliate dashboard, and PayPal payout integration for monetizing word-of-mouth growth', 'integration', 'completed', false, 0, NULL, '2025-11-24 00:00:00+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: Update Mobile App status to 'planned'
-- ============================================================================

UPDATE feature_requests
SET status = 'planned', updated_at = NOW()
WHERE title = 'Mobile App'
AND is_custom = false;

-- ============================================================================
-- STEP 5: Add in-progress features
-- ============================================================================

INSERT INTO feature_requests (title, description, category, status, priority, is_custom, vote_count, requested_by)
VALUES
  ('Social Media Analytics Profile Selection', 'Choose specific profiles under each platform to view targeted analytics. Perfect for agencies and users managing multiple accounts - filter analytics by specific Facebook pages, Instagram accounts, or other platform profiles instead of viewing aggregated data from all accounts.', 'analytics', 'in_progress', 'high', false, 0, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION: Check the results
-- ============================================================================

-- Uncomment to see all pre-suggested features after update:
-- SELECT title, category, status, is_custom, completed_at
-- FROM feature_requests
-- WHERE is_custom = false
-- ORDER BY status DESC, created_at;

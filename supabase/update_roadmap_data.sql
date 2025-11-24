-- SQL Update Script for Live Database
-- Run this in Supabase Dashboard > SQL Editor
-- Last updated: 2025-01-23
-- Purpose: Update feature request dates and Mobile App status

-- ============================================================================
-- STEP 1: Update Completed Feature Dates
-- ============================================================================

-- Update Bulk Post Scheduling to October 24, 2025
UPDATE feature_requests
SET
  completed_at = '2025-10-24 00:00:00+00',
  updated_at = NOW()
WHERE title = 'Bulk Post Scheduling'
  AND is_custom = false
  AND status = 'completed';

-- Update Content Calendar View to October 5, 2025
UPDATE feature_requests
SET
  completed_at = '2025-10-05 00:00:00+00',
  updated_at = NOW()
WHERE title = 'Content Calendar View'
  AND is_custom = false
  AND status = 'completed';

-- Update Post Templates Library to November 2, 2025
UPDATE feature_requests
SET
  completed_at = '2025-11-02 00:00:00+00',
  updated_at = NOW()
WHERE title = 'Post Templates Library'
  AND is_custom = false
  AND status = 'completed';

-- Add Affiliate Program (completed November 24, 2025)
INSERT INTO feature_requests (title, description, category, status, is_custom, vote_count, requested_by, completed_at)
VALUES
  ('Affiliate Program', 'Complete referral program with 30% recurring commissions, automatic tracking, affiliate dashboard, and PayPal payout integration for monetizing word-of-mouth growth', 'integration', 'completed', false, 0, NULL, '2025-11-24 00:00:00+00')
ON CONFLICT (title, is_custom) DO NOTHING;

-- ============================================================================
-- STEP 2: Update Mobile App Status to Planned
-- ============================================================================

UPDATE feature_requests
SET
  status = 'planned',
  updated_at = NOW()
WHERE title = 'Mobile App'
  AND is_custom = false
  AND status = 'submitted';

-- ============================================================================
-- STEP 3: Add in-progress features
-- ============================================================================

INSERT INTO feature_requests (title, description, category, status, priority, is_custom, vote_count, requested_by)
VALUES
  ('Social Media Analytics Profile Selection', 'Choose specific profiles under each platform to view targeted analytics. Perfect for agencies and users managing multiple accounts - filter analytics by specific Facebook pages, Instagram accounts, or other platform profiles instead of viewing aggregated data from all accounts.', 'analytics', 'in_progress', 'high', false, 0, NULL)
ON CONFLICT (title, is_custom) DO NOTHING;

-- ============================================================================
-- STEP 4: Add unique constraint to prevent duplicate features
-- ============================================================================

-- Add constraint if it doesn't exist (prevents duplicate titles per type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_feature_title_per_type'
  ) THEN
    ALTER TABLE feature_requests
    ADD CONSTRAINT unique_feature_title_per_type
    UNIQUE (title, is_custom);
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Check the results
-- ============================================================================

-- View updated completed features
SELECT title, category, status, completed_at, updated_at
FROM feature_requests
WHERE is_custom = false
  AND status = 'completed'
ORDER BY completed_at DESC;

-- View planned features (should include Mobile App)
SELECT title, category, status, vote_count, updated_at
FROM feature_requests
WHERE is_custom = false
  AND status = 'planned'
ORDER BY vote_count DESC;

-- View in-progress features (should include Analytics Profile Selection)
SELECT title, category, status, priority, vote_count, updated_at
FROM feature_requests
WHERE is_custom = false
  AND status = 'in_progress'
ORDER BY priority DESC, vote_count DESC;

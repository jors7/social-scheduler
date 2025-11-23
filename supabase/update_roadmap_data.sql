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

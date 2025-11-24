-- Fix Duplicate "Social Media Analytics Profile Selection" Feature
-- Run this in Supabase Dashboard > SQL Editor
-- Created: 2025-01-24
-- Purpose: Remove duplicate entry and add unique constraint

-- ============================================================================
-- STEP 1: Check for duplicates (for verification)
-- ============================================================================

-- View all "Social Media Analytics Profile Selection" entries
SELECT id, title, vote_count, created_at, is_custom, status
FROM feature_requests
WHERE title = 'Social Media Analytics Profile Selection'
ORDER BY created_at;

-- ============================================================================
-- STEP 2: Delete the duplicate entry (keep the one with votes or oldest)
-- ============================================================================

-- Delete the newer duplicate (keeps the entry with votes or earliest created_at)
DELETE FROM feature_requests
WHERE title = 'Social Media Analytics Profile Selection'
AND id NOT IN (
  -- Keep the one with votes, or if both have same votes, keep the oldest
  SELECT id FROM feature_requests
  WHERE title = 'Social Media Analytics Profile Selection'
  ORDER BY vote_count DESC, created_at ASC
  LIMIT 1
);

-- ============================================================================
-- STEP 3: Add unique constraint to prevent future duplicates
-- ============================================================================

-- This ensures no two features can have the same title within the same type (pre-suggested vs custom)
ALTER TABLE feature_requests
ADD CONSTRAINT unique_feature_title_per_type
UNIQUE (title, is_custom);

-- ============================================================================
-- STEP 4: Verify the fix
-- ============================================================================

-- Should now show only ONE entry for "Social Media Analytics Profile Selection"
SELECT id, title, vote_count, created_at, is_custom, status
FROM feature_requests
WHERE title = 'Social Media Analytics Profile Selection';

-- Check for any other duplicates in the entire table
SELECT title, is_custom, COUNT(*) as count
FROM feature_requests
GROUP BY title, is_custom
HAVING COUNT(*) > 1;

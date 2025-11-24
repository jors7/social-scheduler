-- Fix RLS policies to allow service role access for cron jobs
--
-- Problem: The admin role migration added RLS policies that check:
--   - auth.uid() = user_id OR is_admin(auth.uid())
--
-- When using service role key (for cron jobs), auth.uid() returns NULL,
-- so both conditions evaluate to FALSE, blocking access.
--
-- Solution: Add explicit service role bypass to RLS policies
-- This allows:
--   - Users to see their own posts
--   - Admins to see all posts
--   - Service role to see all posts (for cleanup cron, etc.)

-- =====================================================
-- Fix scheduled_posts RLS Policy
-- =====================================================

DROP POLICY IF EXISTS "Users and admins can view scheduled posts" ON scheduled_posts;

CREATE POLICY "Users and admins can view scheduled posts" ON scheduled_posts
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
    OR auth.jwt() ->> 'role' = 'service_role'
  );

COMMENT ON POLICY "Users and admins can view scheduled posts" ON scheduled_posts IS
  'Allows users to view their own posts, admins to view all posts, and service role for cron jobs (cleanup, analytics, etc.)';

-- =====================================================
-- Fix drafts RLS Policy
-- =====================================================

DROP POLICY IF EXISTS "Users and admins can view drafts" ON drafts;

CREATE POLICY "Users and admins can view drafts" ON drafts
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
    OR auth.jwt() ->> 'role' = 'service_role'
  );

COMMENT ON POLICY "Users and admins can view drafts" ON drafts IS
  'Allows users to view their own drafts, admins to view all drafts, and service role for cron jobs';

-- =====================================================
-- Verification
-- =====================================================

-- This migration fixes the orphaned media cleanup issue where:
-- 1. Cleanup cron runs with service role
-- 2. Tries to query scheduled_posts to find referenced media URLs
-- 3. RLS blocks access (auth.uid() = NULL for service role)
-- 4. Cleanup thinks 0 files are referenced
-- 5. Deletes all files older than 24 hours (including valid thumbnails!)
--
-- After this migration, service role can query the tables and cleanup
-- will correctly preserve media files that are actually referenced.

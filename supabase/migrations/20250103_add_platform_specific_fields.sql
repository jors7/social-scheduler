-- Migration: Add platform-specific posting options
-- Date: 2025-01-03
-- Phase 1: Quick Wins - LinkedIn, YouTube, Threads, Alt Text

-- =====================================================
-- LinkedIn Visibility Settings
-- =====================================================
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS linkedin_visibility TEXT DEFAULT 'PUBLIC'
CHECK (linkedin_visibility IN ('PUBLIC', 'CONNECTIONS', 'LOGGED_IN'));

ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS linkedin_visibility TEXT DEFAULT 'PUBLIC'
CHECK (linkedin_visibility IN ('PUBLIC', 'CONNECTIONS', 'LOGGED_IN'));

-- =====================================================
-- YouTube Compliance Settings
-- =====================================================
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS youtube_made_for_kids BOOLEAN,
ADD COLUMN IF NOT EXISTS youtube_embeddable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS youtube_license TEXT DEFAULT 'youtube'
CHECK (youtube_license IN ('youtube', 'creativeCommon'));

ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS youtube_made_for_kids BOOLEAN,
ADD COLUMN IF NOT EXISTS youtube_embeddable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS youtube_license TEXT DEFAULT 'youtube'
CHECK (youtube_license IN ('youtube', 'creativeCommon'));

-- =====================================================
-- Threads Reply Controls
-- =====================================================
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS threads_reply_control TEXT DEFAULT 'everyone'
CHECK (threads_reply_control IN ('everyone', 'accounts_you_follow', 'mentioned_only'));

ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS threads_reply_control TEXT DEFAULT 'everyone'
CHECK (threads_reply_control IN ('everyone', 'accounts_you_follow', 'mentioned_only'));

-- =====================================================
-- Alt Text for Accessibility
-- =====================================================
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS instagram_alt_text TEXT,
ADD COLUMN IF NOT EXISTS pinterest_alt_text TEXT,
ADD COLUMN IF NOT EXISTS bluesky_alt_text TEXT;

ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS instagram_alt_text TEXT,
ADD COLUMN IF NOT EXISTS pinterest_alt_text TEXT,
ADD COLUMN IF NOT EXISTS bluesky_alt_text TEXT;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON COLUMN scheduled_posts.linkedin_visibility IS 'LinkedIn post visibility: PUBLIC (everyone), CONNECTIONS (connections only), LOGGED_IN (all LinkedIn members)';
COMMENT ON COLUMN scheduled_posts.youtube_made_for_kids IS 'YouTube COPPA compliance - is video made for kids under 13?';
COMMENT ON COLUMN scheduled_posts.youtube_embeddable IS 'Allow embedding video on other websites';
COMMENT ON COLUMN scheduled_posts.youtube_license IS 'Video license: youtube (Standard) or creativeCommon (CC BY)';
COMMENT ON COLUMN scheduled_posts.threads_reply_control IS 'Who can reply to Threads post';
COMMENT ON COLUMN scheduled_posts.instagram_alt_text IS 'Alt text for Instagram image (accessibility)';
COMMENT ON COLUMN scheduled_posts.pinterest_alt_text IS 'Alt text for Pinterest pin (accessibility)';
COMMENT ON COLUMN scheduled_posts.bluesky_alt_text IS 'Alt text for Bluesky image (accessibility)';

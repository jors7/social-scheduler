-- Fix the scheduled_posts table column types
-- This ensures platforms, platform_content, and media_urls are properly JSONB

-- First, check current column types
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'scheduled_posts'
AND column_name IN ('platforms', 'platform_content', 'media_urls');

-- If you need to alter the columns, uncomment and run these:
-- ALTER TABLE scheduled_posts 
--   ALTER COLUMN platforms TYPE JSONB USING platforms::JSONB,
--   ALTER COLUMN platform_content TYPE JSONB USING platform_content::JSONB,
--   ALTER COLUMN media_urls TYPE JSONB USING media_urls::JSONB;

-- Verify the change
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'scheduled_posts'
AND column_name IN ('platforms', 'platform_content', 'media_urls');
-- Add format flag columns to scheduled_posts table
-- These flags preserve the intended post format (story/reel/short) for scheduled posts

ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS instagram_as_story BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instagram_as_reel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS facebook_as_story BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS facebook_as_reel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS youtube_as_short BOOLEAN DEFAULT FALSE;

-- Add comment explaining the purpose of these columns
COMMENT ON COLUMN scheduled_posts.instagram_as_story IS 'If true, post to Instagram as a story instead of feed post';
COMMENT ON COLUMN scheduled_posts.instagram_as_reel IS 'If true, post to Instagram as a reel instead of feed post';
COMMENT ON COLUMN scheduled_posts.facebook_as_story IS 'If true, post to Facebook as a story instead of feed post';
COMMENT ON COLUMN scheduled_posts.facebook_as_reel IS 'If true, post to Facebook as a reel instead of feed post';
COMMENT ON COLUMN scheduled_posts.youtube_as_short IS 'If true, upload to YouTube as a Short instead of regular video';

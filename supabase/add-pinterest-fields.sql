-- Add Pinterest fields to scheduled_posts table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'scheduled_posts'
                 AND column_name = 'pinterest_title') THEN
    ALTER TABLE scheduled_posts ADD COLUMN pinterest_title TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'scheduled_posts'
                 AND column_name = 'pinterest_description') THEN
    ALTER TABLE scheduled_posts ADD COLUMN pinterest_description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'scheduled_posts'
                 AND column_name = 'pinterest_board_id') THEN
    ALTER TABLE scheduled_posts ADD COLUMN pinterest_board_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'scheduled_posts'
                 AND column_name = 'pinterest_link') THEN
    ALTER TABLE scheduled_posts ADD COLUMN pinterest_link TEXT;
  END IF;
END $$;

-- Add Pinterest fields to drafts table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'drafts'
                 AND column_name = 'pinterest_title') THEN
    ALTER TABLE drafts ADD COLUMN pinterest_title TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'drafts'
                 AND column_name = 'pinterest_description') THEN
    ALTER TABLE drafts ADD COLUMN pinterest_description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'drafts'
                 AND column_name = 'pinterest_board_id') THEN
    ALTER TABLE drafts ADD COLUMN pinterest_board_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'drafts'
                 AND column_name = 'pinterest_link') THEN
    ALTER TABLE drafts ADD COLUMN pinterest_link TEXT;
  END IF;
END $$;

-- Add platform_media_url to both tables if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'scheduled_posts'
                 AND column_name = 'platform_media_url') THEN
    ALTER TABLE scheduled_posts ADD COLUMN platform_media_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'drafts'
                 AND column_name = 'platform_media_url') THEN
    ALTER TABLE drafts ADD COLUMN platform_media_url TEXT;
  END IF;
END $$;
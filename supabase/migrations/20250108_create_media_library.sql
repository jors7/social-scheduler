-- Media Library Table
CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  mime_type TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for videos, in seconds
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  used_in_posts INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_media_library_user_id ON media_library(user_id);
CREATE INDEX idx_media_library_created_at ON media_library(created_at DESC);
CREATE INDEX idx_media_library_mime_type ON media_library(mime_type);
CREATE INDEX idx_media_library_tags ON media_library USING GIN(tags);

-- Enable RLS
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own media" ON media_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media" ON media_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media" ON media_library
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media" ON media_library
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update used_in_posts count
CREATE OR REPLACE FUNCTION update_media_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update media usage count when a post is created/deleted
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update usage count for all media URLs in the post
    UPDATE media_library
    SET 
      used_in_posts = used_in_posts + 1,
      last_used_at = NOW()
    WHERE url = ANY(NEW.media_urls::text[])
    AND user_id = NEW.user_id;
  END IF;
  
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    -- Decrease usage count for removed media
    UPDATE media_library
    SET used_in_posts = GREATEST(0, used_in_posts - 1)
    WHERE url = ANY(OLD.media_urls::text[])
    AND user_id = OLD.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for scheduled_posts
DROP TRIGGER IF EXISTS update_media_usage_scheduled ON scheduled_posts;
CREATE TRIGGER update_media_usage_scheduled
  AFTER INSERT OR UPDATE OR DELETE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_media_usage();

-- Create trigger for drafts
DROP TRIGGER IF EXISTS update_media_usage_drafts ON drafts;
CREATE TRIGGER update_media_usage_drafts
  AFTER INSERT OR UPDATE OR DELETE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_media_usage();

-- Function to get media library stats
CREATE OR REPLACE FUNCTION get_media_stats(user_uuid UUID)
RETURNS TABLE(
  total_files INTEGER,
  total_size_mb NUMERIC,
  images_count INTEGER,
  videos_count INTEGER,
  unused_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_files,
    ROUND(SUM(file_size) / 1048576.0, 2) as total_size_mb,
    COUNT(*) FILTER (WHERE mime_type LIKE 'image/%')::INTEGER as images_count,
    COUNT(*) FILTER (WHERE mime_type LIKE 'video/%')::INTEGER as videos_count,
    COUNT(*) FILTER (WHERE used_in_posts = 0)::INTEGER as unused_count
  FROM media_library
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;
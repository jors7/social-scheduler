-- ============================================
-- COMPLETE MEDIA LIBRARY SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- 1. Create Storage Bucket (if not exists)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('post-media', 'post-media', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- 2. Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view all media" ON storage.objects;

-- 3. Create storage RLS policies
CREATE POLICY "Users can upload their own media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view all media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'post-media');

-- 4. Create Media Library Table
CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  used_in_posts INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_library_user_id ON media_library(user_id);
CREATE INDEX IF NOT EXISTS idx_media_library_created_at ON media_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_library_mime_type ON media_library(mime_type);
CREATE INDEX IF NOT EXISTS idx_media_library_tags ON media_library USING GIN(tags);

-- 6. Enable RLS on media_library table
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own media" ON media_library;
DROP POLICY IF EXISTS "Users can insert their own media" ON media_library;
DROP POLICY IF EXISTS "Users can update their own media" ON media_library;
DROP POLICY IF EXISTS "Users can delete their own media" ON media_library;

-- 8. Create RLS Policies for media_library
CREATE POLICY "Users can view their own media" ON media_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media" ON media_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media" ON media_library
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media" ON media_library
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Function to update used_in_posts count
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

-- 10. Create triggers for scheduled_posts (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_posts') THEN
    DROP TRIGGER IF EXISTS update_media_usage_scheduled ON scheduled_posts;
    CREATE TRIGGER update_media_usage_scheduled
      AFTER INSERT OR UPDATE OR DELETE ON scheduled_posts
      FOR EACH ROW
      EXECUTE FUNCTION update_media_usage();
  END IF;
END $$;

-- 11. Create triggers for drafts (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drafts') THEN
    DROP TRIGGER IF EXISTS update_media_usage_drafts ON drafts;
    CREATE TRIGGER update_media_usage_drafts
      AFTER INSERT OR UPDATE OR DELETE ON drafts
      FOR EACH ROW
      EXECUTE FUNCTION update_media_usage();
  END IF;
END $$;

-- 12. Function to get media library stats
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
    COALESCE(ROUND(SUM(file_size) / 1048576.0, 2), 0) as total_size_mb,
    COUNT(*) FILTER (WHERE mime_type LIKE 'image/%')::INTEGER as images_count,
    COUNT(*) FILTER (WHERE mime_type LIKE 'video/%')::INTEGER as videos_count,
    COUNT(*) FILTER (WHERE used_in_posts = 0)::INTEGER as unused_count
  FROM media_library
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- 13. Verify setup
DO $$
BEGIN
  -- Check if bucket exists
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'post-media') THEN
    RAISE NOTICE '✓ Storage bucket "post-media" exists';
  ELSE
    RAISE WARNING '✗ Storage bucket "post-media" not found';
  END IF;
  
  -- Check if media_library table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_library') THEN
    RAISE NOTICE '✓ Table "media_library" exists';
  ELSE
    RAISE WARNING '✗ Table "media_library" not found';
  END IF;
  
  -- Check if RLS is enabled
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'media_library' AND rowsecurity = true) THEN
    RAISE NOTICE '✓ RLS is enabled on media_library';
  ELSE
    RAISE WARNING '✗ RLS is not enabled on media_library';
  END IF;
END $$;

-- If everything runs successfully, you should see:
-- ✓ Storage bucket "post-media" exists
-- ✓ Table "media_library" exists  
-- ✓ RLS is enabled on media_library
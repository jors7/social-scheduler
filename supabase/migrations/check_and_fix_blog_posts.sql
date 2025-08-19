-- Check if blog_posts table exists and fix any issues

-- First, let's see what we have
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'blog_posts'
) as table_exists;

-- If you get an error about indexes already existing, run this to see current structure:
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'blog_posts'
ORDER BY indexname;

-- To safely create or update the blog_posts table, use this:

-- Drop existing indexes if they exist (safe to run even if they don't exist)
DROP INDEX IF EXISTS idx_blog_posts_slug;
DROP INDEX IF EXISTS idx_blog_posts_status;
DROP INDEX IF EXISTS idx_blog_posts_published_at;
DROP INDEX IF EXISTS idx_blog_posts_author;
DROP INDEX IF EXISTS idx_blog_posts_tags;

-- Create table if it doesn't exist (safe to run multiple times)
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  canonical_url TEXT,
  reading_time INTEGER,
  view_count INTEGER DEFAULT 0,
  tags TEXT[],
  category TEXT
);

-- Add any missing columns (safe if columns already exist)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_keywords TEXT[];
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS reading_time INTEGER;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category TEXT;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- Enable RLS if not already enabled
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can read published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin can manage all blog posts" ON blog_posts;

-- Recreate policies
CREATE POLICY "Anyone can read published blog posts"
  ON blog_posts
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admin can manage all blog posts"
  ON blog_posts
  FOR ALL
  USING (
    auth.email() = 'jan.orsula1@gmail.com'
  );

-- Check if update trigger exists, create if not
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's correct
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Check current blog posts
SELECT 
  slug,
  title,
  status,
  published_at,
  created_at
FROM blog_posts
ORDER BY created_at DESC;

-- Insert sample posts only if table is empty
INSERT INTO blog_posts (slug, title, excerpt, content, status, published_at, tags, category, meta_title, meta_description)
SELECT 
  'getting-started-with-socialcal',
  'Getting Started with SocialCal: Your Complete Guide',
  'Learn how to set up your SocialCal account and start scheduling posts across all your social media platforms in minutes.',
  '# Getting Started with SocialCal\n\nWelcome to SocialCal! This guide will help you get started...',
  'published',
  NOW() - INTERVAL '7 days',
  ARRAY['tutorial', 'getting-started', 'guide'],
  'Tutorials',
  'Getting Started with SocialCal - Complete Setup Guide',
  'Step-by-step guide to setting up SocialCal and scheduling your first social media posts across multiple platforms.'
WHERE NOT EXISTS (
  SELECT 1 FROM blog_posts WHERE slug = 'getting-started-with-socialcal'
);

INSERT INTO blog_posts (slug, title, excerpt, content, status, published_at, tags, category, meta_title, meta_description)
SELECT 
  'top-social-media-scheduling-tips',
  'Top 10 Social Media Scheduling Tips for 2024',
  'Maximize your social media impact with these proven scheduling strategies and best practices.',
  '# Top 10 Social Media Scheduling Tips\n\n1. Post at optimal times...',
  'published',
  NOW() - INTERVAL '3 days',
  ARRAY['tips', 'social-media', 'strategy'],
  'Best Practices',
  '10 Social Media Scheduling Tips for Maximum Engagement',
  'Discover the best times to post, content strategies, and scheduling tips to boost your social media engagement.'
WHERE NOT EXISTS (
  SELECT 1 FROM blog_posts WHERE slug = 'top-social-media-scheduling-tips'
);

-- Final check - show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'blog_posts'
ORDER BY ordinal_position;
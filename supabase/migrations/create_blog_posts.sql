-- Create blog posts table for future blog content
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
  reading_time INTEGER, -- in minutes
  view_count INTEGER DEFAULT 0,
  tags TEXT[],
  category TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- Create RLS policies
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Policy for reading published posts (everyone can read)
CREATE POLICY "Anyone can read published blog posts"
  ON blog_posts
  FOR SELECT
  USING (status = 'published');

-- Policy for admin to manage all posts
CREATE POLICY "Admin can manage all blog posts"
  ON blog_posts
  FOR ALL
  USING (
    auth.email() = 'jan.orsula1@gmail.com'
  );

-- Create updated_at trigger
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample blog posts (optional - you can remove this section)
INSERT INTO blog_posts (slug, title, excerpt, content, status, published_at, tags, category, meta_title, meta_description)
VALUES 
  (
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
  ),
  (
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
  )
ON CONFLICT (slug) DO NOTHING;
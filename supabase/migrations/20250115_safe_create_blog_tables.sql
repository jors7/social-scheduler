-- Safe creation of blog tables (checks if they exist first)

-- Create blog categories table if not exists
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog authors table if not exists
CREATE TABLE IF NOT EXISTS public.blog_authors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  twitter_handle TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog posts table if not exists
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_id UUID REFERENCES public.blog_authors(id) ON DELETE SET NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  reading_time INTEGER DEFAULT 5,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false
);

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON public.blog_posts(featured);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);

-- Enable RLS (safe - won't error if already enabled)
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Public can view categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Public can view authors" ON public.blog_authors;
DROP POLICY IF EXISTS "Authors can update their own profile" ON public.blog_authors;
DROP POLICY IF EXISTS "Admins can manage authors" ON public.blog_authors;
DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can view their own drafts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can create posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;

-- Recreate RLS Policies for blog_categories
CREATE POLICY "Public can view categories" ON public.blog_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.blog_categories
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@socialcal.app');

-- Recreate RLS Policies for blog_authors
CREATE POLICY "Public can view authors" ON public.blog_authors
  FOR SELECT USING (true);

CREATE POLICY "Authors can update their own profile" ON public.blog_authors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage authors" ON public.blog_authors
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@socialcal.app');

-- Recreate RLS Policies for blog_posts
CREATE POLICY "Public can view published posts" ON public.blog_posts
  FOR SELECT USING (status = 'published' AND published_at <= NOW());

CREATE POLICY "Authors can view their own drafts" ON public.blog_posts
  FOR SELECT USING (author_id IN (SELECT id FROM public.blog_authors WHERE user_id = auth.uid()));

CREATE POLICY "Authors can create posts" ON public.blog_posts
  FOR INSERT WITH CHECK (author_id IN (SELECT id FROM public.blog_authors WHERE user_id = auth.uid()));

CREATE POLICY "Authors can update their own posts" ON public.blog_posts
  FOR UPDATE USING (author_id IN (SELECT id FROM public.blog_authors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all posts" ON public.blog_posts
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@socialcal.app');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment post view count
CREATE OR REPLACE FUNCTION increment_post_view_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default categories if they don't exist
INSERT INTO public.blog_categories (name, slug, description, color, order_index)
VALUES 
  ('Social Media Tips', 'social-media-tips', 'Best practices and strategies for social media marketing', '#3B82F6', 1),
  ('Product Updates', 'product-updates', 'Latest features and improvements to SocialCal', '#10B981', 2),
  ('Marketing Strategy', 'marketing-strategy', 'Comprehensive guides for digital marketing success', '#8B5CF6', 3),
  ('Case Studies', 'case-studies', 'Success stories from our customers', '#F59E0B', 4),
  ('Industry News', 'industry-news', 'Stay updated with social media platform changes', '#EF4444', 5)
ON CONFLICT (slug) DO NOTHING;
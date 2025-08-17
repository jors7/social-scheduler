-- Create admin users table for managing admin access
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users table
CREATE POLICY "Only admins can view admin users" ON public.admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

CREATE POLICY "Only admins can manage admin users" ON public.admin_users
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Function to check if a user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial admin (replace with your email)
INSERT INTO public.admin_users (user_id, created_by)
SELECT id, id FROM auth.users WHERE email = 'admin@socialcal.app'
ON CONFLICT (user_id) DO NOTHING;

-- Update blog RLS policies to use admin check
DROP POLICY IF EXISTS "Authors can create posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can view their own drafts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;

-- Only admins can create blog posts
CREATE POLICY "Admins can create posts" ON public.blog_posts
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Only admins can update posts
CREATE POLICY "Admins can update posts" ON public.blog_posts
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Only admins can delete posts
CREATE POLICY "Admins can delete posts" ON public.blog_posts
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Admins can view all posts (including drafts)
CREATE POLICY "Admins can view all posts" ON public.blog_posts
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users) OR
    (status = 'published' AND published_at <= NOW())
  );

-- Update blog_authors policies
DROP POLICY IF EXISTS "Authors can update their own profile" ON public.blog_authors;
DROP POLICY IF EXISTS "Admins can manage authors" ON public.blog_authors;

CREATE POLICY "Admins can manage authors" ON public.blog_authors
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Update blog_categories policies  
DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;

CREATE POLICY "Admins can manage categories" ON public.blog_categories
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Update blog_media policies
DROP POLICY IF EXISTS "Authors can upload media" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can update their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can delete their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Admins can manage all media" ON public.blog_media;

CREATE POLICY "Admins can upload media" ON public.blog_media
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

CREATE POLICY "Admins can update media" ON public.blog_media
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

CREATE POLICY "Admins can delete media" ON public.blog_media
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );
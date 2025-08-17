-- This migration updates blog RLS policies to use admin_users table
-- Run this ONLY AFTER blog tables are created

-- Check if blog tables exist before updating policies
DO $$
BEGIN
  -- Update blog_posts policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS "Authors can create posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Authors can update their own posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Authors can view their own drafts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;
    
    -- Create new admin-only policies
    CREATE POLICY "Admins can create posts" ON public.blog_posts
      FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );

    CREATE POLICY "Admins can update posts" ON public.blog_posts
      FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );

    CREATE POLICY "Admins can delete posts" ON public.blog_posts
      FOR DELETE USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );

    CREATE POLICY "Admins can view all posts" ON public.blog_posts
      FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users) OR
        (status = 'published' AND published_at <= NOW())
      );
  END IF;

  -- Update blog_authors policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_authors') THEN
    DROP POLICY IF EXISTS "Authors can update their own profile" ON public.blog_authors;
    DROP POLICY IF EXISTS "Admins can manage authors" ON public.blog_authors;

    CREATE POLICY "Admins can manage authors" ON public.blog_authors
      FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );
  END IF;

  -- Update blog_categories policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_categories') THEN
    DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;

    CREATE POLICY "Admins can manage categories" ON public.blog_categories
      FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );
  END IF;

  -- Update blog_media policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_media') THEN
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
  END IF;
END $$;
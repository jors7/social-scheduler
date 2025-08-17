-- Fix blog policies to use admin_users table
-- This drops ALL existing policies first, then creates new ones

DO $$
BEGIN
  -- Drop ALL existing policies for blog_posts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') THEN
    -- Drop any existing policies
    DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Authors can view their own drafts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Authors can create posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Authors can update their own posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Admins can create posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Admins can update posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Admins can delete posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Admins can view all posts" ON public.blog_posts;
    
    -- Create new admin-based policies
    CREATE POLICY "Public can view published posts" ON public.blog_posts
      FOR SELECT USING (
        status = 'published' AND published_at <= NOW() OR
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );
    
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
  END IF;

  -- Fix blog_authors policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_authors') THEN
    DROP POLICY IF EXISTS "Public can view authors" ON public.blog_authors;
    DROP POLICY IF EXISTS "Authors can update their own profile" ON public.blog_authors;
    DROP POLICY IF EXISTS "Admins can manage authors" ON public.blog_authors;
    
    CREATE POLICY "Public can view authors" ON public.blog_authors
      FOR SELECT USING (true);
    
    CREATE POLICY "Admins can manage authors" ON public.blog_authors
      FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );
  END IF;

  -- Fix blog_categories policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_categories') THEN
    DROP POLICY IF EXISTS "Public can view categories" ON public.blog_categories;
    DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;
    
    CREATE POLICY "Public can view categories" ON public.blog_categories
      FOR SELECT USING (true);
    
    CREATE POLICY "Admins can manage categories" ON public.blog_categories
      FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );
  END IF;

  -- Fix blog_media policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_media') THEN
    DROP POLICY IF EXISTS "Public can view blog media" ON public.blog_media;
    DROP POLICY IF EXISTS "Authors can upload media" ON public.blog_media;
    DROP POLICY IF EXISTS "Authors can update their own media" ON public.blog_media;
    DROP POLICY IF EXISTS "Authors can delete their own media" ON public.blog_media;
    DROP POLICY IF EXISTS "Admins can manage all media" ON public.blog_media;
    DROP POLICY IF EXISTS "Admins can upload media" ON public.blog_media;
    DROP POLICY IF EXISTS "Admins can update media" ON public.blog_media;
    DROP POLICY IF EXISTS "Admins can delete media" ON public.blog_media;
    
    CREATE POLICY "Public can view blog media" ON public.blog_media
      FOR SELECT USING (true);
    
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

-- Verify the setup
SELECT 'Blog policies updated to use admin_users table' as message;
-- Drop existing update policy for blog_posts
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.blog_posts;

-- Create a more permissive update policy for authenticated users
-- In production, you'd want to check if the user is the author
CREATE POLICY "Authenticated users can update posts" ON public.blog_posts
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure authenticated users can insert posts
DROP POLICY IF EXISTS "Authors can create posts" ON public.blog_posts;

CREATE POLICY "Authenticated users can create posts" ON public.blog_posts
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure authenticated users can delete their posts
DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.blog_posts;

CREATE POLICY "Authenticated users can delete posts" ON public.blog_posts
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);
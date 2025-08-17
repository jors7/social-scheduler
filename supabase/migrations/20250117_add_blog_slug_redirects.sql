-- Create a table to track old slugs for redirects
CREATE TABLE IF NOT EXISTS public.blog_slug_redirects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  old_slug TEXT NOT NULL UNIQUE,
  new_slug TEXT NOT NULL,
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_blog_slug_redirects_old_slug ON public.blog_slug_redirects(old_slug);

-- Enable RLS
ALTER TABLE public.blog_slug_redirects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view redirects" ON public.blog_slug_redirects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage redirects" ON public.blog_slug_redirects
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Function to automatically create redirect when slug changes
CREATE OR REPLACE FUNCTION create_slug_redirect()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create redirect if slug actually changed
  IF OLD.slug IS DISTINCT FROM NEW.slug THEN
    -- Delete any existing redirect for this old slug
    DELETE FROM public.blog_slug_redirects WHERE old_slug = OLD.slug;
    
    -- Insert new redirect
    INSERT INTO public.blog_slug_redirects (old_slug, new_slug, post_id)
    VALUES (OLD.slug, NEW.slug, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track slug changes
CREATE TRIGGER blog_posts_slug_change
  AFTER UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION create_slug_redirect();
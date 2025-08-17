-- Add SEO fields to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS meta_keywords TEXT[],
ADD COLUMN IF NOT EXISTS og_title TEXT,
ADD COLUMN IF NOT EXISTS og_description TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT,
ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- Add indexes for SEO fields
CREATE INDEX IF NOT EXISTS idx_blog_posts_meta_keywords ON public.blog_posts USING GIN(meta_keywords);
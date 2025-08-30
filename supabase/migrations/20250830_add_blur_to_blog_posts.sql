-- Add featured_image_blur column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS featured_image_blur TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.blog_posts.featured_image_blur IS 'Base64-encoded blur placeholder for the featured image';
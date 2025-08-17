-- Create blog media table for tracking uploaded images
CREATE TABLE IF NOT EXISTS public.blog_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  cloudflare_id TEXT,
  type TEXT DEFAULT 'image',
  alt_text TEXT,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blog_media_post_id ON public.blog_media(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_media_uploaded_by ON public.blog_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_blog_media_created_at ON public.blog_media(created_at DESC);

-- Enable RLS
ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view blog media" ON public.blog_media
  FOR SELECT USING (true);

CREATE POLICY "Authors can upload media" ON public.blog_media
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by OR
    auth.uid() IN (SELECT user_id FROM public.blog_authors)
  );

CREATE POLICY "Authors can update their own media" ON public.blog_media
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Authors can delete their own media" ON public.blog_media
  FOR DELETE USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all media" ON public.blog_media
  FOR ALL USING (auth.jwt() ->> 'email' = 'admin@socialcal.app');
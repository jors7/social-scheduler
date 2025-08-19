-- Create SEO settings table for dynamic metadata management
CREATE TABLE IF NOT EXISTS seo_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT UNIQUE NOT NULL, -- e.g., '/', '/pricing', '/about'
  title TEXT,
  description TEXT,
  keywords TEXT[], -- Array of keywords
  og_title TEXT,
  og_description TEXT,
  og_image TEXT, -- URL to the OG image
  og_type TEXT DEFAULT 'website',
  twitter_card TEXT DEFAULT 'summary_large_image',
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  canonical_url TEXT,
  robots TEXT DEFAULT 'index, follow',
  author TEXT,
  structured_data JSONB, -- Store JSON-LD data
  custom_meta JSONB, -- Any additional meta tags
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create RLS policies
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;

-- Policy for reading (everyone can read)
CREATE POLICY "Anyone can read SEO settings"
  ON seo_settings
  FOR SELECT
  USING (true);

-- Policy for updating (only admin email)
CREATE POLICY "Only admin can update SEO settings"
  ON seo_settings
  FOR ALL
  USING (
    auth.email() = 'jan.orsula1@gmail.com'
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seo_settings_updated_at
  BEFORE UPDATE ON seo_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default SEO settings for main pages
INSERT INTO seo_settings (page_path, title, description, keywords, og_title, og_description, og_image)
VALUES 
  (
    '/',
    'SocialCal - Schedule Posts Across All Social Media Platforms',
    'Save 15+ hours weekly with SocialCal. Schedule and manage social media posts across Twitter/X, Instagram, Facebook, LinkedIn, YouTube, TikTok, Threads, Bluesky, and Pinterest from one powerful dashboard.',
    ARRAY['social media scheduler', 'social media management', 'content scheduling', 'social media automation'],
    'SocialCal - Schedule Posts Across All Social Media Platforms',
    'Save 15+ hours weekly. Schedule and manage social media posts across 9+ platforms from one dashboard.',
    'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp'
  ),
  (
    '/pricing',
    'Pricing - Affordable Social Media Management Plans',
    'Choose the perfect SocialCal plan for your needs. Start with a 7-day free trial. Plans from $9/month with unlimited posts, AI captions, and analytics.',
    ARRAY['social media pricing', 'social media management pricing', 'affordable social media tools'],
    'SocialCal Pricing - Start Your 7-Day Free Trial',
    'Affordable social media management starting at $9/month. Unlimited posts, AI-powered captions, analytics.',
    'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp'
  ),
  (
    '/about',
    'About SocialCal - Your Social Media Management Partner',
    'Learn about SocialCal, the all-in-one social media management platform helping businesses save time and grow their online presence.',
    ARRAY['about socialcal', 'social media tool', 'social media platform'],
    'About SocialCal - Your Social Media Management Partner',
    'The all-in-one social media management platform helping businesses save time and grow online.',
    'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp'
  ),
  (
    '/blog',
    'SocialCal Blog - Social Media Marketing Tips & Strategies',
    'Expert insights on social media marketing, content strategies, and platform updates to help you grow your online presence.',
    ARRAY['social media blog', 'marketing tips', 'content strategy'],
    'SocialCal Blog - Social Media Marketing Tips',
    'Expert insights on social media marketing and content strategies.',
    'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp'
  )
ON CONFLICT (page_path) DO NOTHING;
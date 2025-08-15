-- Update existing blog author to Jan Orsula
UPDATE public.blog_authors 
SET 
  display_name = 'Jan Orsula',
  bio = 'Founder of SocialCal, passionate about helping businesses and creators master social media scheduling.',
  avatar_url = '/Jan-Orsula.png'
WHERE display_name = 'SocialCal Team';

-- If no author exists with 'SocialCal Team', update the first author (if any)
UPDATE public.blog_authors 
SET 
  display_name = 'Jan Orsula',
  bio = 'Founder of SocialCal, passionate about helping businesses and creators master social media scheduling.',
  avatar_url = '/Jan-Orsula.png'
WHERE id = (SELECT id FROM public.blog_authors LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM public.blog_authors WHERE display_name = 'Jan Orsula');
-- Create or update author profile for admin users
-- Replace the email with your actual admin email
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@socialcal.app'; -- Replace with your email
  
  IF admin_user_id IS NOT NULL THEN
    -- Check if author profile exists
    IF EXISTS (SELECT 1 FROM public.blog_authors WHERE user_id = admin_user_id) THEN
      -- Update existing profile
      UPDATE public.blog_authors
      SET 
        display_name = 'Jan Orsula',
        bio = 'Blog author and admin',
        avatar_url = '/Jan-Orsula.png'
      WHERE user_id = admin_user_id;
    ELSE
      -- Insert new profile
      INSERT INTO public.blog_authors (user_id, display_name, bio, avatar_url)
      VALUES (
        admin_user_id,
        'Jan Orsula',
        'Blog author and admin',
        '/Jan-Orsula.png'
      );
    END IF;
  END IF;
END $$;
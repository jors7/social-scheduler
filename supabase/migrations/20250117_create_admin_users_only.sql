-- Create admin users table for managing admin access
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users table
CREATE POLICY "Only admins can view admin users" ON public.admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

CREATE POLICY "Only admins can manage admin users" ON public.admin_users
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Function to check if a user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial admin (replace with your email)
INSERT INTO public.admin_users (user_id, created_by)
SELECT id, id FROM auth.users WHERE email = 'admin@socialcal.app'
ON CONFLICT (user_id) DO NOTHING;
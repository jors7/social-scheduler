-- Fix the infinite recursion in admin_users RLS policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Only admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can manage admin users" ON public.admin_users;

-- Create new policies without recursion
-- Allow admins to see the admin table (using auth.uid() directly)
CREATE POLICY "Admins can view admin users" ON public.admin_users
  FOR SELECT USING (true); -- All authenticated users can see who is admin

-- Only existing admins can manage admin users
-- We check if the current user exists in the table without causing recursion
CREATE POLICY "Admins can manage admin users" ON public.admin_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update admin users" ON public.admin_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete admin users" ON public.admin_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    )
  );

-- Alternative: If you still get recursion, use this simpler approach
-- DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
-- DROP POLICY IF EXISTS "Admins can manage admin users" ON public.admin_users;
-- DROP POLICY IF EXISTS "Admins can update admin users" ON public.admin_users;
-- DROP POLICY IF EXISTS "Admins can delete admin users" ON public.admin_users;

-- CREATE POLICY "Anyone can view admin users" ON public.admin_users
--   FOR SELECT USING (true);

-- CREATE POLICY "Only service role can manage admin users" ON public.admin_users
--   FOR ALL USING (false); -- This means only service role can modify
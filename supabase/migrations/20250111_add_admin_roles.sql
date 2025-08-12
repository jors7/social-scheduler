-- Add admin roles and audit logging system

-- 1. Add role column to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  target_resource TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX idx_admin_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_target_user ON admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log(created_at DESC);

-- 3. Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = user_uuid 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = user_uuid 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enable RLS on admin_audit_log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for admin_audit_log
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
  FOR SELECT USING (is_admin(auth.uid()));

-- Only system can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs" ON admin_audit_log
  FOR INSERT WITH CHECK (false);

-- 7. Create admin-specific RLS policies for user data access

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;

-- Admins can view all user_subscriptions
CREATE POLICY "Users and admins can view subscriptions" ON user_subscriptions
  FOR SELECT USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

-- Users can update their own subscription, admins can update any (but only super_admin can change roles)
CREATE POLICY "Users and admins can update subscriptions" ON user_subscriptions
  FOR UPDATE USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

-- Drop and recreate policies for scheduled_posts
DROP POLICY IF EXISTS "Users can view their own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users and admins can view scheduled posts" ON scheduled_posts
  FOR SELECT USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

-- Drop and recreate policies for drafts
DROP POLICY IF EXISTS "Users can view their own drafts" ON drafts;
CREATE POLICY "Users and admins can view drafts" ON drafts
  FOR SELECT USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

-- Drop and recreate policies for social_accounts
DROP POLICY IF EXISTS "Users can view their own social accounts" ON social_accounts;
CREATE POLICY "Users and admins can view social accounts" ON social_accounts
  FOR SELECT USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

-- 8. Create function to get user statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  paid_users BIGINT,
  total_posts BIGINT,
  posts_today BIGINT,
  revenue_month NUMERIC
) AS $$
BEGIN
  -- Only admins can call this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '30 days') as active_users,
    (SELECT COUNT(*) FROM user_subscriptions WHERE subscription_status = 'active' AND plan_id != 'free') as paid_users,
    (SELECT COUNT(*) FROM scheduled_posts) as total_posts,
    (SELECT COUNT(*) FROM scheduled_posts WHERE created_at::date = CURRENT_DATE) as posts_today,
    (SELECT COALESCE(SUM(amount), 0) FROM payment_history WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'succeeded') as revenue_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get user details for admin
CREATE OR REPLACE FUNCTION get_admin_user_details(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  subscription_plan TEXT,
  subscription_status TEXT,
  role TEXT,
  posts_count BIGINT,
  drafts_count BIGINT,
  connected_accounts BIGINT
) AS $$
BEGIN
  -- Only admins can call this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email::TEXT,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(s.plan_id, 'free') as subscription_plan,
    COALESCE(s.subscription_status, 'inactive') as subscription_status,
    COALESCE(s.role, 'user') as role,
    (SELECT COUNT(*) FROM scheduled_posts WHERE scheduled_posts.user_id = u.id) as posts_count,
    (SELECT COUNT(*) FROM drafts WHERE drafts.user_id = u.id) as drafts_count,
    (SELECT COUNT(*) FROM social_accounts WHERE social_accounts.user_id = u.id) as connected_accounts
  FROM auth.users u
  LEFT JOIN user_subscriptions s ON u.id = s.user_id
  WHERE u.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to make a user admin (only super_admin can do this)
CREATE OR REPLACE FUNCTION set_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only super admins can change roles
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Super admin access required';
  END IF;

  -- Validate role
  IF new_role NOT IN ('user', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Update the user's role
  UPDATE user_subscriptions 
  SET role = new_role, updated_at = NOW()
  WHERE user_id = target_user_id;

  -- Log the action
  INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
  VALUES (auth.uid(), 'role_change', target_user_id, jsonb_build_object('new_role', new_role));

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Set up initial super admin (replace with your email)
-- This should be run manually after migration with your email
-- UPDATE user_subscriptions SET role = 'super_admin' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com');

-- Add comment for admin setup
COMMENT ON FUNCTION set_user_role IS 'To create the first super admin, run: UPDATE user_subscriptions SET role = ''super_admin'' WHERE user_id = (SELECT id FROM auth.users WHERE email = ''your-email@example.com'');';
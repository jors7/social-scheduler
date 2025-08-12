-- Clean Admin Setup Migration
-- Run this in Supabase SQL Editor

-- Step 1: Add role column to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Step 2: Create admin audit log table
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
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_user ON admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_log(created_at DESC);

-- Step 3: Create helper functions
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

-- Step 4: Enable RLS on admin_audit_log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for admin_audit_log
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON admin_audit_log
  FOR INSERT WITH CHECK (false);

-- Step 6: Update RLS policies for existing tables to support admin access
-- Note: These will create new policies or fail gracefully if they exist

-- For user_subscriptions
DO $$ 
BEGIN
  -- Try to create the policy, ignore if it exists
  CREATE POLICY "Admins can view all subscriptions" ON user_subscriptions
    FOR SELECT USING (is_admin(auth.uid()));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- For scheduled_posts
DO $$ 
BEGIN
  CREATE POLICY "Admins can view all scheduled posts" ON scheduled_posts
    FOR SELECT USING (is_admin(auth.uid()));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- For drafts
DO $$ 
BEGIN
  CREATE POLICY "Admins can view all drafts" ON drafts
    FOR SELECT USING (is_admin(auth.uid()));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- For social_accounts
DO $$ 
BEGIN
  CREATE POLICY "Admins can view all social accounts" ON social_accounts
    FOR SELECT USING (is_admin(auth.uid()));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 7: Create admin statistics function
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
    (SELECT COUNT(*) FROM auth.users)::BIGINT as total_users,
    (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '30 days')::BIGINT as active_users,
    (SELECT COUNT(*) FROM user_subscriptions WHERE subscription_status = 'active' AND plan_id != 'free')::BIGINT as paid_users,
    (SELECT COUNT(*) FROM scheduled_posts)::BIGINT as total_posts,
    (SELECT COUNT(*) FROM scheduled_posts WHERE created_at::date = CURRENT_DATE)::BIGINT as posts_today,
    (SELECT COALESCE(SUM(amount), 0) FROM payment_history WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'succeeded')::NUMERIC as revenue_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Success message
DO $$
BEGIN
  RAISE NOTICE 'Admin system setup complete! Now make yourself a super admin:';
  RAISE NOTICE 'UPDATE user_subscriptions SET role = ''super_admin'' WHERE user_id = (SELECT id FROM auth.users WHERE email = ''your-email@example.com'');';
END $$;
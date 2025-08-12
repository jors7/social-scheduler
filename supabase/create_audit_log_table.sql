-- Create admin_audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  target_resource TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);

-- Enable RLS but allow admins to read
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON admin_audit_log;

-- Create new policies
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Allow service role to insert (this is handled by the service key, not a policy)
-- The service role bypasses RLS entirely

-- Insert a test audit log entry to verify the table works
INSERT INTO admin_audit_log (admin_id, action, target_resource, details)
SELECT 
  auth.uid(),
  'test_audit_log',
  'audit_system',
  '{"test": true, "timestamp": "' || NOW() || '"}'::jsonb
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verify the table has data
SELECT COUNT(*) as total_logs FROM admin_audit_log;

-- Show the last 5 logs
SELECT 
  id,
  admin_id,
  action,
  target_user_id,
  target_resource,
  created_at
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 5;
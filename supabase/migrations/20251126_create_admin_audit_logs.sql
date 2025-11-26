-- Admin audit logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying by admin
CREATE INDEX idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);

-- Index for querying by action type
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);

-- Index for querying by resource
CREATE INDEX idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);

-- Index for querying by date
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- RLS policies
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON admin_audit_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users
    )
  );

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs" ON admin_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON admin_audit_logs TO authenticated;
GRANT INSERT ON admin_audit_logs TO service_role;

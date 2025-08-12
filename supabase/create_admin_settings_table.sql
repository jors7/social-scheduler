-- Create admin_settings table to store system-wide settings
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type TEXT DEFAULT 'general',
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_admin_settings_type ON admin_settings(setting_type);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view settings" ON admin_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Super admins can update settings" ON admin_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Insert default settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description)
VALUES 
  ('require_2fa_admins', '{"enabled": false}', 'security', 'Require 2FA for admin accounts'),
  ('auto_logout', '{"enabled": true, "timeout_minutes": 30}', 'security', 'Auto logout inactive sessions'),
  ('audit_logging', '{"enabled": true}', 'security', 'Enable audit logging'),
  ('max_posts_per_user', '{"limit": 1000}', 'limits', 'Maximum posts per user'),
  ('max_social_accounts', '{"limit": 10}', 'limits', 'Maximum social accounts per user'),
  ('trial_period_days', '{"days": 7}', 'limits', 'Trial period duration'),
  ('storage_limit_mb', '{"limit": 500}', 'limits', 'Storage limit per user in MB'),
  ('notify_new_signups', '{"enabled": false}', 'notifications', 'Notify on new user signups'),
  ('notify_payment_issues', '{"enabled": true}', 'notifications', 'Notify on payment failures'),
  ('notify_system_errors', '{"enabled": true}', 'notifications', 'Notify on system errors')
ON CONFLICT (setting_key) DO NOTHING;

-- Verify settings were created
SELECT setting_key, setting_value, setting_type 
FROM admin_settings 
ORDER BY setting_type, setting_key;
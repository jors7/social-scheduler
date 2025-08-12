-- Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'jan.orsula1@gmail.com';

-- Insert a test audit log entry with your actual user ID
INSERT INTO admin_audit_log (
  admin_id, 
  action, 
  target_user_id,
  target_resource, 
  details,
  created_at
)
SELECT 
  id,
  'manual_test_entry',
  NULL,
  'test_resource',
  '{"test": true, "note": "Manual test from SQL"}'::jsonb,
  NOW()
FROM auth.users 
WHERE email = 'jan.orsula1@gmail.com';

-- Verify it was inserted
SELECT 
  id,
  admin_id,
  action,
  target_resource,
  details,
  created_at
FROM admin_audit_log
WHERE action = 'manual_test_entry'
ORDER BY created_at DESC
LIMIT 1;

-- Check total count
SELECT COUNT(*) as total_audit_logs FROM admin_audit_log;
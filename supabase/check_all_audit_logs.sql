-- Check all audit logs to see what's there
SELECT 
  id,
  admin_id,
  action,
  target_user_id,
  target_resource,
  details,
  created_at
FROM admin_audit_log
ORDER BY created_at DESC;

-- Check if there are any logs from today
SELECT 
  COUNT(*) as logs_today
FROM admin_audit_log
WHERE created_at >= CURRENT_DATE;

-- Check unique actions
SELECT 
  DISTINCT action,
  COUNT(*) as count
FROM admin_audit_log
GROUP BY action
ORDER BY count DESC;
-- Check if audit log table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'admin_audit_log'
);

-- Check the structure of the admin_audit_log table
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_audit_log'
ORDER BY ordinal_position;

-- Check if there are any audit logs
SELECT COUNT(*) as total_logs FROM admin_audit_log;

-- Get the latest 10 audit logs
SELECT 
    id,
    admin_id,
    action,
    target_user_id,
    target_resource,
    details,
    created_at
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 10;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'admin_audit_log';
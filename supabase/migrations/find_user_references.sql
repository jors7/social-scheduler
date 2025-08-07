-- Find all tables that reference this user
SELECT 
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'users'
ORDER BY tc.table_name;

-- Also check what data exists for this user in various tables
SELECT 'user_subscriptions' as table_name, COUNT(*) as count FROM user_subscriptions WHERE user_id = 'e84dd065-637d-4455-b130-b07014f5183b'
UNION ALL
SELECT 'social_accounts', COUNT(*) FROM social_accounts WHERE user_id = 'e84dd065-637d-4455-b130-b07014f5183b'
UNION ALL
SELECT 'scheduled_posts', COUNT(*) FROM scheduled_posts WHERE user_id = 'e84dd065-637d-4455-b130-b07014f5183b'
UNION ALL
SELECT 'drafts', COUNT(*) FROM drafts WHERE user_id = 'e84dd065-637d-4455-b130-b07014f5183b'
UNION ALL
SELECT 'payment_history', COUNT(*) FROM payment_history WHERE user_id = 'e84dd065-637d-4455-b130-b07014f5183b';
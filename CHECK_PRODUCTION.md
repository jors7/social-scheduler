# Production Checklist for Blog System

Run these checks in your **production** Supabase dashboard:

## 1. Check if all tables exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('blog_posts', 'blog_authors', 'blog_categories', 'blog_media', 'admin_users');
```

## 2. Check if you're an admin
```sql
SELECT * FROM admin_users 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-production-email@example.com'
);
```

## 3. Check if you have an author profile
```sql
SELECT * FROM blog_authors 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-production-email@example.com'
);
```

## 4. Check if the blog post exists
```sql
SELECT id, title, slug, status 
FROM blog_posts 
WHERE id = '586a40a6-51a9-41a7-83d0-02fb33ee8be8';
```

## 5. Check RLS policies
```sql
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('blog_posts', 'blog_authors', 'admin_users');
```

## Environment Variables to Check in Vercel:
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] R2_ACCOUNT_ID (if using R2)
- [ ] R2_ACCESS_KEY_ID (if using R2)
- [ ] R2_SECRET_ACCESS_KEY (if using R2)
- [ ] R2_BUCKET_NAME (if using R2)
- [ ] R2_PUBLIC_URL (if using R2)

## Quick Fix SQL Scripts

### If admin_users table is missing:
```sql
-- Run the admin users creation from:
-- /supabase/migrations/20250117_create_admin_users_only.sql
```

### If blog tables are missing:
```sql
-- Run the blog tables creation from:
-- /supabase/migrations/20250115_safe_create_blog_tables.sql
```

### If author profile is missing:
```sql
INSERT INTO public.blog_authors (user_id, display_name, bio, avatar_url)
SELECT 
  id,
  'Jan Orsula',
  'Blog author and admin',
  '/Jan-Orsula.png'
FROM auth.users
WHERE email = 'your-production-email@example.com';
```

### If RLS policies are wrong:
```sql
-- Run the RLS fix from:
-- /supabase/migrations/20250117_fix_blog_admin_policies.sql
```
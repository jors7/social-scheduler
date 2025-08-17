# Complete Blog Management System Replication Guide

This guide contains everything needed to replicate the blog management system from SocialCal to your new application.

## 📦 Required NPM Packages

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "@tiptap/extension-character-count": "^3.0.9",
    "@tiptap/extension-code-block-lowlight": "^3.2.0",
    "@tiptap/extension-image": "^3.2.0",
    "@tiptap/extension-link": "^3.0.9",
    "@tiptap/extension-placeholder": "^3.0.9",
    "@tiptap/extension-table": "^3.2.0",
    "@tiptap/extension-table-cell": "^3.2.0",
    "@tiptap/extension-table-header": "^3.2.0",
    "@tiptap/extension-table-row": "^3.2.0",
    "@tiptap/extension-text-align": "^3.2.0",
    "@tiptap/extension-youtube": "^3.2.0",
    "@tiptap/react": "^3.0.9",
    "@tiptap/starter-kit": "^3.0.9",
    "@aws-sdk/client-s3": "^3.x.x",
    "lowlight": "^3.x.x",
    "react-dropzone": "^14.x.x",
    "date-fns": "^2.x.x"
  }
}
```

## 🔐 Admin Access Setup

The blog management system is restricted to admin users only. Here's how to set it up:

### 1. Create Admin Users Table

```sql
-- Create admin users table for managing admin access
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users table
CREATE POLICY "Only admins can view admin users" ON public.admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

CREATE POLICY "Only admins can manage admin users" ON public.admin_users
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Function to check if a user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Add Initial Admin User

```sql
-- Insert yourself as the first admin (replace with your email)
INSERT INTO public.admin_users (user_id, created_by)
SELECT id, id FROM auth.users WHERE email = 'your-admin-email@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

## 🗄️ Database Schema

Run these SQL migrations in order in your Supabase SQL editor:

### 3. Create Core Blog Tables

```sql
-- Create blog categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog authors table
CREATE TABLE IF NOT EXISTS public.blog_authors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  twitter_handle TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_id UUID REFERENCES public.blog_authors(id) ON DELETE SET NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  reading_time INTEGER DEFAULT 5,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  -- SEO fields
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  canonical_url TEXT
);

-- Create indexes
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX idx_blog_posts_featured ON public.blog_posts(featured);
CREATE INDEX idx_blog_categories_slug ON public.blog_categories(slug);
CREATE INDEX idx_blog_posts_meta_keywords ON public.blog_posts USING GIN(meta_keywords);
```

### 4. Create Media and Redirect Tables

```sql
-- Create blog media table
CREATE TABLE IF NOT EXISTS public.blog_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  cloudflare_id TEXT,
  type TEXT DEFAULT 'image',
  alt_text TEXT,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create slug redirects table
CREATE TABLE IF NOT EXISTS public.blog_slug_redirects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  old_slug TEXT NOT NULL UNIQUE,
  new_slug TEXT NOT NULL,
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_blog_media_post_id ON public.blog_media(post_id);
CREATE INDEX idx_blog_media_uploaded_by ON public.blog_media(uploaded_by);
CREATE INDEX idx_blog_media_created_at ON public.blog_media(created_at DESC);
CREATE INDEX idx_blog_slug_redirects_old_slug ON public.blog_slug_redirects(old_slug);
```

### 5. Enable Row Level Security (RLS) - Admin Only Access

```sql
-- Enable RLS on all tables
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_slug_redirects ENABLE ROW LEVEL SECURITY;

-- Blog Categories Policies
CREATE POLICY "Public can view categories" ON public.blog_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.blog_categories
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Blog Authors Policies
CREATE POLICY "Public can view authors" ON public.blog_authors
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage authors" ON public.blog_authors
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Blog Posts Policies (Admin Only for Management)
CREATE POLICY "Public can view published posts" ON public.blog_posts
  FOR SELECT USING (
    status = 'published' AND published_at <= NOW() OR
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

CREATE POLICY "Admins can create posts" ON public.blog_posts
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can update posts" ON public.blog_posts
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can delete posts" ON public.blog_posts
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Blog Media Policies (Admin Only)
CREATE POLICY "Public can view blog media" ON public.blog_media
  FOR SELECT USING (true);

CREATE POLICY "Admins can upload media" ON public.blog_media
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can update media" ON public.blog_media
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can delete media" ON public.blog_media
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Slug Redirects Policies
CREATE POLICY "Public can view redirects" ON public.blog_slug_redirects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage redirects" ON public.blog_slug_redirects
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### 6. Create Helper Functions and Triggers

```sql
-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment post view count
CREATE OR REPLACE FUNCTION increment_post_view_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create redirect when slug changes
CREATE OR REPLACE FUNCTION create_slug_redirect()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.slug IS DISTINCT FROM NEW.slug THEN
    DELETE FROM public.blog_slug_redirects WHERE old_slug = OLD.slug;
    INSERT INTO public.blog_slug_redirects (old_slug, new_slug, post_id)
    VALUES (OLD.slug, NEW.slug, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track slug changes
CREATE TRIGGER blog_posts_slug_change
  AFTER UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION create_slug_redirect();
```

### 7. Insert Default Categories

```sql
INSERT INTO public.blog_categories (name, slug, description, color, order_index)
VALUES 
  ('General', 'general', 'General blog posts and updates', '#3B82F6', 1),
  ('Tutorials', 'tutorials', 'Step-by-step guides and how-tos', '#10B981', 2),
  ('News', 'news', 'Latest news and announcements', '#8B5CF6', 3),
  ('Tips & Tricks', 'tips-tricks', 'Quick tips and useful tricks', '#F59E0B', 4),
  ('Case Studies', 'case-studies', 'Success stories and case studies', '#EF4444', 5)
ON CONFLICT (slug) DO NOTHING;
```

### 8. Create Admin Author Profile

```sql
-- Create an author profile for yourself (replace with your details)
INSERT INTO public.blog_authors (user_id, display_name, bio, avatar_url)
SELECT 
  id,
  'Your Name',
  'Your bio here',
  'https://your-avatar-url.com/avatar.jpg'
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT DO NOTHING;
```

## 🪣 Storage Setup

### Supabase Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket called `media`
3. Set it as public
4. Add these RLS policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND bucket_id = 'media');

-- Allow public to view
CREATE POLICY "Public can view media" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own media" ON storage.objects
FOR DELETE USING (auth.uid() = owner AND bucket_id = 'media');
```

## 🌍 Environment Variables

Add these to your `.env.local`:

```env
# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cloudflare R2 Storage (Optional - for better image performance)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-custom-domain.com # or https://pub-xxx.r2.dev
```

## 🔧 Cloudflare R2 Setup (Optional but Recommended)

### 1. Create R2 Bucket
1. Go to Cloudflare Dashboard → R2
2. Create a new bucket (e.g., `blog-images`)
3. Go to Settings → Public Access
4. Configure public access with a custom domain or use the default R2.dev subdomain

### 2. Create API Token
1. Go to My Profile → API Tokens
2. Create token with these permissions:
   - Account: R2:Edit
   - Zone: None needed

### 3. Configure CORS (if needed)
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

## 📁 Files to Copy

Copy these files from the SocialCal project to your new project:

### Admin Protection Files
- `/lib/auth/admin.ts` - Admin check utilities
- `/app/dashboard/blog/layout.tsx` - Protected layout wrapper
- `/middleware.ts` - Update with admin route protection

### API Routes
- `/app/api/blog/posts/route.ts` - Blog posts API
- `/app/api/blog/upload/route.ts` - Image upload handler

### Dashboard Pages
- `/app/dashboard/blog/page.tsx` - Blog management dashboard
- `/app/dashboard/blog/new/page.tsx` - Create new post
- `/app/dashboard/blog/[id]/edit/page.tsx` - Edit existing post

### Components
Copy the entire `/components/blog/` folder:
- `blog-editor.tsx` - Rich text editor component
- `blog-editor.module.css` - Editor styles
- `blog-card.tsx` - Blog card component
- `blog-grid.tsx` - Blog grid layout
- `blog-search.tsx` - Search component
- `blog-categories.tsx` - Categories filter
- `blog-pagination.tsx` - Pagination component
- `blog-share-buttons.tsx` - Social share buttons
- `blog-hero.tsx` - Hero section
- `blog-post-author.tsx` - Author info
- `blog-post-content.tsx` - Post content renderer
- `blog-post-header.tsx` - Post header
- `blog-table-of-contents.tsx` - Table of contents
- `blog-layout.tsx` - Blog layout wrapper

### Public Blog Pages (if needed)
- `/app/blog/page.tsx` - Public blog listing
- `/app/blog/[slug]/page.tsx` - Individual blog post

## 🎨 Required UI Components

Make sure you have these shadcn/ui components installed:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add table
npx shadcn-ui@latest add toast
```

## 🚀 Quick Setup Steps

1. **Install packages**: `npm install` all the required packages
2. **Run migrations**: Execute all SQL scripts in order (1-8)
3. **Add yourself as admin**: Update the admin user insert with your email
4. **Create storage bucket**: Set up the `media` bucket in Supabase Storage
5. **Configure environment**: Add all environment variables
6. **Copy files**: Copy all blog-related files to your project
7. **Update middleware**: Add admin route protection to your middleware
8. **Test admin access**: Navigate to `/dashboard/blog` and verify access
9. **Create author profile**: Run the SQL to create your author profile
10. **Test upload**: Try creating a blog post with image upload

## 🧪 Testing the Setup

1. **Test Admin Access**:
   - Navigate to `/dashboard/blog`
   - Should only work if you're in the `admin_users` table
   - Non-admins should be redirected with an error

2. **Test Blog Management**:
   - Click "New Post"
   - Try the editor features:
     - Text formatting
     - Image upload (drag & drop or click)
     - YouTube embed
     - Tables
   - Save as draft
   - Publish the post
   - Check if it appears in the public blog

## 🐛 Common Issues & Solutions

### Access Denied to Blog Dashboard
- Ensure your user is in the `admin_users` table
- Check the middleware is properly configured
- Verify RLS policies are applied

### Images not uploading
- Check Supabase Storage bucket exists and is public
- Verify RLS policies are correct
- Check file size (max 5MB)
- Ensure user is admin

### R2 upload failing
- Verify all R2 environment variables are set
- Check API token has correct permissions
- Ensure bucket is configured for public access

### Editor not loading
- Make sure all TipTap packages are installed
- Check for console errors
- Clear browser cache

### Cannot create posts
- Ensure you're an admin user
- Ensure you have an author profile created
- Check RLS policies
- Verify you're logged in

## 📝 Important Security Notes

- **Admin Access**: Only users in the `admin_users` table can manage blog posts
- **First Admin**: Make sure to add yourself as the first admin user
- **RLS Policies**: All blog management operations require admin privileges
- **Public Access**: Only published posts are visible to the public
- **Middleware Protection**: The middleware adds an extra layer of security
- R2 storage is optional but recommended for better performance
- The blog system supports markdown but uses a rich text editor
- All images are automatically optimized if using Cloudflare R2
- SEO fields are included for better search engine visibility

## 🔗 Integration Points

The blog system integrates with:
- Supabase Auth for user management
- Supabase Storage or Cloudflare R2 for media
- Your existing dashboard layout
- Your existing authentication flow

Make sure these are already set up in your application before adding the blog system.
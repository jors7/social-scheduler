# Blog Management System Documentation

## Overview
The SocialCal blog management system provides a comprehensive solution for creating, editing, and managing blog posts with rich text editing, image uploads, and SEO optimization.

## Features

### ✅ Implemented Features
- **Blog Dashboard** - View and manage all blog posts
- **Rich Text Editor** - TipTap-based WYSIWYG editor with:
  - Text formatting (bold, italic, headings)
  - Lists (bullet, numbered)
  - Blockquotes and code blocks
  - Tables
  - Links
  - Image upload with drag & drop
  - YouTube video embeds
  - Character count
- **Image Management** 
  - Local upload to Supabase Storage
  - Cloudflare Images integration ready
  - Drag & drop support
  - Featured images for posts
- **Post Management**
  - Create, edit, delete posts
  - Draft/Published status
  - Categories and tags
  - Featured posts
  - SEO fields (slug, excerpt)
  - Reading time calculation
  - View count tracking
- **Preview Mode** - See how posts will appear before publishing

## Access the Blog System

### For Authors/Admins
1. Navigate to `/dashboard/blog` when logged in
2. Click "New Post" to create a blog post
3. Use the rich editor to write content
4. Upload images by clicking the image icon or dragging files
5. Set categories, tags, and SEO settings
6. Save as draft or publish immediately

### For Readers
- Visit `/blog` to see published posts
- Individual posts are accessible at `/blog/[slug]`

## Database Schema

### Tables Created
- `blog_posts` - Main posts table
- `blog_authors` - Author profiles
- `blog_categories` - Post categories
- `blog_media` - Image/media tracking

## Cloudflare Images Setup (Optional)

To enable Cloudflare Images for optimized image delivery:

### 1. Create Cloudflare Account
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Images
3. Enable Cloudflare Images ($5/month)

### 2. Get API Credentials
1. Go to My Profile → API Tokens
2. Create a token with `Cloudflare Images:Edit` permission
3. Note your Account ID from the dashboard

### 3. Configure Environment Variables
Add to `.env.local`:
```env
# Cloudflare Images
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_IMAGES_API_TOKEN=your_api_token
CLOUDFLARE_IMAGES_ACCOUNT_HASH=your_account_hash
```

### 4. Benefits of Cloudflare Images
- Automatic image optimization
- On-the-fly resizing
- Global CDN delivery
- WebP/AVIF format support
- Bandwidth savings

## Image Storage Options

### Current: Supabase Storage (Default)
- Images stored in Supabase Storage bucket
- No additional setup required
- Good for small to medium blogs
- Limited optimization

### Upgrade: Cloudflare Images (Recommended)
- Professional image delivery
- Automatic optimization
- Multiple variants (thumbnail, display, full)
- $5/month for 100,000 images
- Better performance

### Alternative: Cloudflare R2
- More control over storage
- Cheaper for large files
- Requires more setup
- $0.015/GB stored

## API Endpoints

### Blog Upload API
- **Endpoint**: `/api/blog/upload`
- **Method**: POST
- **Body**: FormData with 'file' field
- **Response**: `{ url: string, variants?: {...} }`
- Automatically uses Cloudflare if configured, falls back to Supabase

## Editor Features

### Text Formatting
- **Bold**: Cmd/Ctrl + B
- **Italic**: Cmd/Ctrl + I
- **Heading 2/3**: Click toolbar buttons
- **Lists**: Bullet and numbered
- **Blockquote**: For quotes
- **Code Block**: With syntax highlighting

### Media
- **Images**: Click image icon or drag & drop
- **YouTube**: Paste video URL
- **Tables**: Insert 3x3 table

### SEO & Metadata
- **Custom slug**: URL-friendly permalinks
- **Excerpt**: Summary for listings
- **Categories**: Organize content
- **Tags**: Topic labels
- **Featured image**: Hero image for post

## Troubleshooting

### Images Not Uploading
1. Check Supabase Storage bucket exists
2. Verify RLS policies allow uploads
3. Check file size (max 5MB)

### Cloudflare Images Not Working
1. Verify environment variables are set
2. Check API token permissions
3. Ensure billing is active

### Editor Not Loading
1. Clear browser cache
2. Check console for errors
3. Verify all packages installed

## Future Enhancements
- [ ] Markdown import/export
- [ ] Revision history
- [ ] Scheduled publishing
- [ ] Multi-author collaboration
- [ ] Comments system
- [ ] Related posts
- [ ] Search functionality
- [ ] RSS feed
- [ ] Newsletter integration

## Technical Stack
- **Editor**: TipTap v2
- **Storage**: Supabase Storage / Cloudflare Images
- **Database**: Supabase (PostgreSQL)
- **UI**: Shadcn/ui components
- **Framework**: Next.js 14 App Router
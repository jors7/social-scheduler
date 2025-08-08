# Storage Setup for Media Library

To enable media uploads in the application, you need to set up the storage bucket in Supabase.

## Steps to Configure Storage

### 1. Enable Storage in Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. If Storage is not enabled, click to enable it

### 2. Run the Storage Setup SQL
1. Go to the **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy and paste the contents of `/supabase/create-storage-bucket.sql`
4. Run the query

This will:
- Create a public bucket called `post-media`
- Set up proper RLS policies for authenticated users
- Allow users to upload, update, and delete their own media
- Allow public viewing of all media

### 3. Run the Media Library Migration
1. In the SQL Editor, create another new query
2. Copy and paste the contents of `/supabase/migrations/20250108_create_media_library.sql`
3. Run the query

This will:
- Create the `media_library` table for storing media metadata
- Set up indexes for performance
- Create triggers to track media usage in posts
- Add a function to get media statistics

## Troubleshooting

### "Storage bucket not configured" error
- Make sure you've run the storage bucket SQL
- Verify the bucket exists in Storage > Buckets

### "Storage permissions error"
- Check that the RLS policies were created successfully
- Verify you're logged in when trying to upload

### "Failed to save to library" error
- Make sure the media_library table exists
- Check that you've run the migration SQL

### Files upload but don't appear
- Check browser console for errors
- Verify the media_library table has proper RLS policies
- Make sure your user ID matches between auth and database

## Storage Limits
- Maximum file size: 50MB per file
- Supported formats: Images (jpg, png, gif, webp) and Videos (mp4, webm, mov)
- Files are stored in user-specific folders for organization
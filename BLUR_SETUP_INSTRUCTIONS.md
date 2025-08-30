# Blur Placeholder Setup for Existing Blog Posts

## Step 1: Add Database Column

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run this SQL command:

```sql
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS featured_image_blur TEXT;

COMMENT ON COLUMN public.blog_posts.featured_image_blur IS 'Base64-encoded blur placeholder for the featured image';
```

## Step 2: Generate Blur for Existing Posts

After adding the column, run this command in your terminal:

```bash
node scripts/generate-blur-for-existing-posts.js
```

This will:
- Find all blog posts with featured images
- Generate blur placeholders for each image
- Save the blur data to the database
- Show progress and results

## What This Does

- **Automatic**: Processes all existing blog posts
- **Smart**: Only processes posts without blur data
- **Safe**: Won't overwrite existing blur data
- **Fast**: Takes about 1-2 seconds per image

## Verification

After running, your blog posts will have:
- Instant blur previews while images load
- Zero layout shift
- Better performance scores
- Smoother user experience

## Troubleshooting

If you see an error about the column not existing:
1. Make sure you ran the SQL command in Step 1
2. Wait a few seconds for the database to update
3. Try running the script again

## Future Posts

New blog posts will automatically get blur placeholders when you upload images through the blog editor - no manual steps needed!
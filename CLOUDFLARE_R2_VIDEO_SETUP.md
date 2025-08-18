# Cloudflare R2 Video Setup Guide

## Setting up Cloudflare R2 for Video Hosting

### Step 1: Upload Videos to R2

1. Go to your Cloudflare dashboard → R2
2. Select your existing bucket (probably `social-scheduler-media`)
3. Create a new folder called `videos` or `demos`
4. Upload your video files:
   - Cross-Platform.mp4
   - Customization.mp4
   - Drag-and-Drop.mp4
   - Low-Cost.mp4
   - Clean UX.mp4

### Step 2: Enable Public Access (if not already enabled)

1. In your R2 bucket settings, go to "Settings"
2. Under "Public Access", enable "R2.dev subdomain"
3. Copy your public bucket URL (e.g., `https://pub-xxx.r2.dev`)

### Step 3: Update Your Code

Replace the video paths in `capabilities-carousel.tsx`:

```tsx
const capabilities = [
  {
    // ... other fields
    video: 'https://pub-xxx.r2.dev/videos/Cross-Platform.mp4'
  },
  // ... etc
]
```

### Step 4: Set Up Custom Domain (Optional but Recommended)

1. Go to R2 → Your Bucket → Settings → Custom Domains
2. Add a subdomain like `cdn.yourdomain.com`
3. Cloudflare will automatically:
   - Create DNS records
   - Provide SSL certificate
   - Enable CDN caching

### Step 5: Optimize with Transform Rules (Optional)

Create a transform rule to serve WebP images and optimized videos:

1. Go to Rules → Transform Rules → Modify Response Header
2. Create rule:
   - When: `(http.request.uri.path contains "/videos/")`
   - Then: Add header `Cache-Control: public, max-age=31536000`

### Step 6: Update Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_CDN_URL=https://cdn.yourdomain.com
# or
NEXT_PUBLIC_CDN_URL=https://pub-xxx.r2.dev
```

Then update your component:

```tsx
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || ''

const capabilities = [
  {
    // ... other fields
    video: `${CDN_URL}/videos/Cross-Platform.mp4`
  },
  // ... etc
]
```

## Benefits of Using R2 for Videos

1. **No Bandwidth Charges**: Unlike S3, R2 has no egress fees
2. **Global CDN**: Automatic edge caching via Cloudflare's network
3. **Fast Loading**: Videos served from nearest edge location
4. **Cost Effective**: $0.015 per GB stored per month
5. **Automatic Optimization**: Cloudflare can compress and optimize on-the-fly

## Video Optimization Tips

Before uploading to R2, optimize your videos:

```bash
# Compress video for web (reduces file size by 60-80%)
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart output.mp4

# Remove audio if not needed (saves 10-20% size)
ffmpeg -i input.mp4 -c:v copy -an output.mp4

# Create multiple quality versions
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -s 854x480 output-480p.mp4
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -s 1280x720 output-720p.mp4
```

## Monitoring Usage

1. Check R2 dashboard for:
   - Storage used
   - Number of requests
   - Bandwidth saved (compared to traditional CDN)

2. Use Cloudflare Analytics to track:
   - Video views
   - Geographic distribution
   - Performance metrics

## Troubleshooting

If videos don't load:
1. Check CORS settings in R2 bucket
2. Verify public access is enabled
3. Test direct R2 URL in browser
4. Check browser console for errors
5. Ensure video format is supported (MP4 with H.264 codec)
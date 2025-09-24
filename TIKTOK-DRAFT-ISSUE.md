# TikTok Draft Not Appearing - Troubleshooting

## The Issue
When posting to TikTok as a draft, the API returns success with a `publish_id`, but the video doesn't appear in TikTok drafts.

## Root Cause
The video file (`1758686219772-pwvgfz.mp4`) no longer exists in Supabase storage. When checked:
- Direct Supabase URL returns HTTP 400 (file not found)
- Proxy endpoint returns 404 because it can't fetch the missing file
- TikTok can't download a non-existent video, so no draft is created

## Why This Happens
1. **Video uploaded to Supabase** → Gets temporary URL
2. **URL sent to TikTok** → TikTok queues for download
3. **Video deleted from Supabase** → Perhaps automatic cleanup
4. **TikTok tries to download** → Fails silently
5. **No draft appears** → Because video download failed

## The Fix Applied
1. **Removed proxy complexity** - Using direct Supabase URLs
2. **Added URL validation** - Check if video exists before sending to TikTok
3. **Better error messages** - Clear feedback when video is missing

## To Test Again
1. **Upload a NEW video** (don't use old URLs)
2. **Post immediately** after upload (before cleanup)
3. **Wait 1-2 minutes** for TikTok processing
4. **Check TikTok drafts**

## Important Notes
- TikTok uses **PULL_FROM_URL** - they download your video asynchronously
- Processing can take **30 seconds to 2 minutes**
- Videos must remain accessible until TikTok downloads them
- Consider extending Supabase storage retention for videos

## Status Check
Use the publish_id to check status:
```bash
curl -X POST http://localhost:3001/api/tiktok/check-status \
  -H "Content-Type: application/json" \
  -d '{"publishId": "v_inbox_url~v2.7553503752628652054"}'
```

## Next Steps for Production
1. Ensure videos persist long enough for TikTok to download
2. Implement status polling after upload
3. Add retry logic if download fails
4. Consider direct upload instead of PULL_FROM_URL for reliability
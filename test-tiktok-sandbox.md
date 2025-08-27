# TikTok Sandbox Testing Guide

## Current Implementation Status ✅

### Sandbox Mode Enforcement
- **Location**: `/lib/tiktok/service.ts` lines 85-89
- **Behavior**: All posts are automatically set to `SELF_ONLY` (private) privacy level
- **UI Warning**: Displayed in TikTokVideoSettings component (lines 34-37)

### Key Changes Made
1. **Privacy Level Override**: Sandbox apps can only post privately
2. **Inbox Endpoint Usage**: Private posts use the inbox endpoint
3. **Domain Verification**: Using proxy through socialcal.app domain
4. **Video URL Conversion**: Automatic conversion from Supabase to proxy URL

## Testing Steps

### 1. Pre-Test Verification
```bash
# Check if TikTok account is connected
SELECT * FROM social_accounts WHERE platform = 'tiktok' AND is_active = true;
```

### 2. Upload Video Test
1. Go to Dashboard > Create New Post
2. Select TikTok as platform
3. Upload a video file (MP4, MOV, or AVI)
   - Should bypass Vercel and upload directly to Supabase
   - Max size: 287.6 MB

### 3. Privacy Settings Test
1. Check that sandbox warning appears: "Sandbox Mode: Videos will be posted as private (SELF_ONLY)"
2. Try changing privacy level - it should always revert to SELF_ONLY
3. Save as Draft toggle should work but still use SELF_ONLY

### 4. Posting Test
1. Add caption (max 2200 characters, displayed as 150 in UI)
2. Click "Post Now"
3. Monitor console for:
   - Video URL conversion to proxy
   - Request to inbox endpoint (not direct post)
   - Privacy level enforcement

### 5. Expected Response
```json
{
  "success": true,
  "publishId": "v2.xxxxx",
  "message": "Video sent to TikTok inbox for review"
}
```

## Common Issues & Solutions

### Issue 1: "Integration Guidelines" Error
**Cause**: Using non-SELF_ONLY privacy in sandbox mode
**Solution**: Already enforced in code - all posts use SELF_ONLY

### Issue 2: Domain Verification Error
**Cause**: TikTok can't access Supabase URLs
**Solution**: Proxy endpoint converts URLs to socialcal.app domain

### Issue 3: 413 Payload Too Large
**Cause**: Video exceeding Vercel limits
**Solution**: Direct upload to Supabase implemented

### Issue 4: Missing Video Error
**Cause**: TikTok requires video content
**Solution**: UI validation checks for video before enabling post button

## Debug Information

### Check Request Structure
The TikTok service logs the full request at line 123:
```javascript
console.log('TikTok upload request:', {
  endpoint,
  isDraft,
  videoUrl,
  title: title.substring(0, 50) + '...'
});
```

### Check Error Details
Enhanced error logging at lines 142-146:
```javascript
console.error('TikTok upload init error:', {
  status: initResponse.status,
  error: errorData,
  endpoint: endpoint,
  requestBody: requestBody
});
```

## Post-Production Checklist
When app is approved for production:
1. Change `isSandbox = false` in `/lib/tiktok/service.ts` line 85
2. Remove/update sandbox warning in UI
3. Enable all privacy levels
4. Switch to direct post endpoint for public posts
5. Update environment variables with production credentials

## Verification in TikTok App
After posting:
1. Open TikTok mobile app
2. Go to Profile > Drafts (for SELF_ONLY posts)
3. Video should appear there for final editing and publishing
4. Can change privacy settings in the app after posting
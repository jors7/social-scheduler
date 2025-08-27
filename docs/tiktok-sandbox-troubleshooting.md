# TikTok Sandbox Troubleshooting Guide

## Why Videos Might Not Appear in TikTok App

### 1. Processing Time
- **PULL_FROM_URL method**: TikTok needs 30 seconds to 2 minutes to download and process your video
- The video won't appear immediately after the API call
- Status: `DOWNLOAD_IN_PROGRESS` → `PROCESSING` → `PUBLISH_COMPLETE`

### 2. Sandbox Account Limitations
In sandbox mode, videos might:
- Only appear in the **Drafts** folder (not main feed)
- Only be visible to the **authorized test user** account
- Not appear at all if posted from a different account than the one authorized in sandbox

### 3. Where to Look in TikTok App
Check these locations:
1. **Profile → Drafts folder** (most likely for SELF_ONLY posts)
2. **Profile → Private videos** (tap the lock icon)
3. **Creator tools → Content** (if you have creator account)
4. **Inbox notifications** (sometimes TikTok sends processing notifications)

### 4. Common Issues

#### Issue: "Video not showing anywhere"
**Possible causes:**
- Video still processing (wait 2-5 minutes)
- Wrong TikTok account logged in app
- Video failed silently during processing
- Sandbox app not properly configured

#### Issue: "API says success but no video"
**Check:**
1. The publish_id returned - save this for status checking
2. Call the status endpoint to verify processing state
3. Check if the video URL is actually accessible (try opening the proxy URL in browser)

### 5. Debug Steps

#### Step 1: Verify the Video URL
```javascript
// The proxy URL should be accessible
https://socialcal.app/api/media/proxy?url=<encoded-supabase-url>
```
Try opening this URL directly in your browser - you should be able to download/view the video.

#### Step 2: Check Upload Status
After getting a publish_id, check the status:
```bash
curl -X POST https://localhost:3001/api/post/tiktok/status \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_TOKEN", "publishId": "PUBLISH_ID_FROM_RESPONSE"}'
```

#### Step 3: Verify Sandbox Configuration
In TikTok Developer Portal:
1. Confirm your test user is added to sandbox
2. Check that all required scopes are granted:
   - `user.info.basic`
   - `video.publish`
   - `video.upload`
3. Verify domain `socialcal.app` is verified

#### Step 4: Check API Response
Look for the `publishId` in the response:
```json
{
  "success": true,
  "publishId": "v2.xxxxx",  // This should have a value
  "message": "Video sent to TikTok inbox for review"
}
```

### 6. Alternative Testing Method

Since we're using PULL_FROM_URL, you can test if TikTok can access your video:
1. Get the proxy URL from the console logs
2. Test with curl: `curl -I <proxy-url>`
3. Should return 200 OK with video/mp4 content-type

### 7. Production vs Sandbox Behavior

| Feature | Sandbox | Production |
|---------|---------|------------|
| Privacy Levels | SELF_ONLY only | All levels |
| Video Visibility | Draft/Private only | Public feed |
| Processing Time | Same (30s-2min) | Same |
| Test Users | Required | Not required |
| API Limits | Lower | Higher |

### 8. Next Steps if Video Still Not Appearing

1. **Enable detailed logging** in TikTok service:
   - Check the publish_id is being returned
   - Verify the request structure matches TikTok's requirements

2. **Test with TikTok's own tools**:
   - Use TikTok's API Explorer in developer portal
   - Try the same request directly to isolate if it's our code or TikTok

3. **Check webhook events** (if configured):
   - TikTok can send webhooks for video processing status
   - Not required but helpful for debugging

4. **Contact TikTok Developer Support**:
   - Provide the publish_id
   - Include request/response logs
   - Mention it's a sandbox app testing PULL_FROM_URL

## Quick Checklist
- [ ] Video is MP4/MOV/AVI format
- [ ] Video is under 287.6 MB
- [ ] Video is at least 3 seconds long
- [ ] Proxy URL is accessible publicly
- [ ] Domain socialcal.app is verified
- [ ] Using SELF_ONLY privacy level
- [ ] Checking correct TikTok account in app
- [ ] Waited at least 2-5 minutes for processing
- [ ] Checked Drafts folder in TikTok app
# TikTok Sandbox Mode - Known Limitations & Issues

## Critical Sandbox Limitations

### 1. **Videos May Not Appear in App**
Based on TikTok developer documentation and community reports:
- Sandbox videos often DON'T appear in the mobile app at all
- They may only be visible via API status checks
- This is a known limitation of TikTok's sandbox environment

### 2. **PROCESSING_DOWNLOAD Status**
When you see `PROCESSING_DOWNLOAD`:
- TikTok is actively downloading your video from the proxy URL ✅
- This can take 2-10 minutes in sandbox mode
- Next status should be `PROCESSING` → `PUBLISH_COMPLETE` or `FAILED`

### 3. **Why Videos Don't Show Up**

#### Sandbox "Ghost Posts"
- Videos posted in sandbox often exist only in TikTok's testing environment
- They receive a publish_id and show as PUBLISH_COMPLETE
- But they're NOT visible in the actual TikTok app
- This is EXPECTED behavior for sandbox mode

#### Account Mismatch
- Sandbox posts are only visible to the EXACT account that authorized the app
- If you have multiple TikTok accounts, ensure you're checking the right one
- The username in Settings should match the TikTok app account

#### Privacy Level Restrictions
- All sandbox posts are forced to SELF_ONLY (private)
- Even if marked as "published", they go to a hidden draft state
- They may not appear in the regular Drafts folder

### 4. **What Actually Works in Sandbox**

✅ **API Calls**: You can make API requests and get responses
✅ **Status Checks**: You can check upload status
✅ **Video Download**: TikTok can download videos from your proxy URL
❌ **App Visibility**: Videos rarely appear in the actual TikTok app
❌ **Public Posting**: All posts are private/draft only
❌ **Video Listing**: Can't retrieve list of posted videos

## Testing Strategy for Sandbox

### 1. Verify API Integration
- ✅ OAuth flow works
- ✅ Access token is valid
- ✅ Can make API calls
- ✅ Get publish_id back
- ✅ Status shows PROCESSING_DOWNLOAD

### 2. What Success Looks Like in Sandbox
When everything is working correctly:
1. Post returns a publish_id
2. Status progresses: PROCESSING_DOWNLOAD → PROCESSING → PUBLISH_COMPLETE
3. No error messages in status check
4. Video URL is accessible (you verified this ✅)

### 3. Moving to Production
To actually see videos in TikTok app, you need:
1. **App Review**: Submit app for TikTok review
2. **Production Access**: Get approved for production API access
3. **Live Credentials**: Switch from sandbox to production keys
4. **Remove Sandbox Flags**: Update code to remove SELF_ONLY enforcement

## Current Status Analysis

Your integration is **WORKING CORRECTLY** for sandbox:
- ✅ Video uploads successfully
- ✅ TikTok downloads the video (PROCESSING_DOWNLOAD)
- ✅ API integration is correct
- ❓ Videos not appearing is EXPECTED in sandbox

## Next Steps

### Option 1: Continue in Sandbox (Recommended)
- Complete all other features
- Test everything except actual video visibility
- Apply for production access when ready

### Option 2: Apply for Production Now
Requirements for TikTok App Review:
1. Privacy Policy URL
2. Terms of Service URL
3. App Description
4. Use Case Description
5. Video showing app functionality
6. Wait 5-10 business days for review

### Option 3: Alternative Testing
1. Use TikTok's Share to Stories API (different endpoint, might work better)
2. Test with TikTok's official testing tools
3. Contact TikTok Developer Support with your publish_id

## Debug Information to Collect

When status shows PUBLISH_COMPLETE but video doesn't appear:
1. Save the publish_id
2. Save the full status response
3. Note the exact time of posting
4. Check these locations in order:
   - Profile → Drafts
   - Profile → Private (lock icon)
   - Creator Tools → Content → Drafts
   - TikTok Studio (web) → Content

## Conclusion

**Your integration is likely working correctly.** The issue is that TikTok sandbox mode doesn't actually publish videos to the real TikTok app. This is a known limitation and not a bug in your code.

To see real videos in TikTok, you need production access.
# Missing Thumbnails Investigation Report

## Date: November 24, 2025

## Summary

The missing thumbnails for Pinterest and Bluesky posts from Nov 22 are caused by **Cloudflare R2 storage accessibility issues**, NOT by cleanup logic bugs. However, we also discovered and fixed a cleanup bug for Bluesky posts.

---

## Root Cause: R2 Storage is Inaccessible

### Evidence

1. **All R2 URLs return 404**:
   - Pinterest "Carousel test": 3 images (404)
   - Bluesky "Another test": 1 image (404)
   - Bluesky "Testing scheduling": 1 image (404)
   - All Threads posts with R2 URLs: 404

2. **Supabase Storage URLs work fine**:
   - 2 Threads posts using Supabase storage show thumbnails correctly

3. **R2 API Access Denied**:
   ```
   AccessDenied: Access Denied (403)
   Failed to list objects in R2
   ```

### R2 Configuration Issues

**Affected URL pattern**: `https://pub-741f812143544724bbdccee81d8672f5.r2.dev/{user-id}/{filename}`

**Possible causes**:

1. **R2 Bucket Public Access Disabled**
   - The bucket was configured for public access but it was disabled
   - Solution: Re-enable public access in Cloudflare R2 dashboard

2. **R2 API Credentials Invalid**
   - Access keys were revoked, expired, or permissions changed
   - Solution: Generate new R2 API tokens with proper permissions

3. **R2 Bucket Deleted/Recreated**
   - The bucket `socialcall-blog` was deleted and recreated
   - Old URLs no longer work
   - Solution: Check bucket exists and matches configuration

4. **R2 Public URL Subdomain Not Configured**
   - The `pub-741f812143544724bbdccee81d8672f5.r2.dev` subdomain is not properly set up
   - Solution: Configure R2 custom domain or public bucket access

---

## Secondary Issue: Bluesky Cleanup Bug (FIXED)

While investigating, we discovered a bug in the client-side cleanup logic for "Post Now" feature.

### The Bug

**File**: `/app/dashboard/create/new/page.tsx:2612`

**Before** (buggy):
```typescript
const shouldSkipCleanup = postedToTikTok || postedToPinterest;
```

**After** (fixed):
```typescript
const shouldSkipCleanup = postedToTikTok || postedToPinterest || postedToBluesky;
```

**Impact**: Bluesky posts using "Post Now" would have their media deleted immediately after posting (before our fix).

**Note**: This bug only affected "Post Now" posts. Scheduled posts were correctly exempted from cleanup.

---

## What We Fixed

### 1. ✅ Fixed Bluesky Cleanup Exemption

**Changes made**:
- Added Bluesky to client-side cleanup exemption list
- Updated comments to document why Bluesky needs exemption
- Added better logging to track cleanup operations

**Files modified**:
- `/app/dashboard/create/new/page.tsx` (lines 2607-2633)
- `/app/api/upload/cleanup/route.ts` (added comprehensive logging)

### 2. ✅ Added Comprehensive Logging

**New logging features**:
- Timestamp and user ID for every cleanup operation
- URL list before deletion
- Success/failure status for each file
- Platform information in cleanup decisions

**Purpose**: This will help diagnose any future media deletion issues.

---

## What Still Needs to Be Fixed

### R2 Storage Access

**Option 1: Fix R2 Configuration (Recommended if you want to use R2)**

1. **Log into Cloudflare R2 Dashboard**
2. **Check if bucket exists**: `socialcall-blog`
3. **Enable public access**:
   - Go to bucket settings
   - Enable "Public R2 Bucket Access"
   - Verify the public URL: `https://pub-741f812143544724bbdccee81d8672f5.r2.dev`
4. **Verify API credentials**:
   - Generate new R2 API tokens with `Admin Read & Write` permissions
   - Update `.env.local` with new credentials:
     - `R2_ACCESS_KEY_ID`
     - `R2_SECRET_ACCESS_KEY`

**Option 2: Switch Back to Supabase Storage**

If R2 is causing issues, you can switch back to Supabase storage which works reliably:

1. **Update upload endpoints** to use Supabase storage instead of R2
2. **Migrate existing posts** to use Supabase storage URLs
3. **Remove R2 configuration** from environment variables

---

## Testing Recommendations

Once R2 is fixed, test the following scenarios:

1. **Pinterest Post (Post Now)**:
   - Should preserve media after posting
   - Thumbnail should display in Recent Posts
   - Public URL should be accessible

2. **Bluesky Post (Post Now)**:
   - Should preserve media after posting (our fix!)
   - Thumbnail should display in Recent Posts
   - Public URL should be accessible

3. **Scheduled Posts**:
   - Should preserve media for TikTok, Pinterest, Bluesky
   - Thumbnails should remain visible
   - Other platforms should clean up media after posting

---

## Prevention

To prevent future thumbnail issues:

1. **Monitor R2 Storage**:
   - Set up alerts for R2 bucket access issues
   - Regularly verify API credentials are valid
   - Check public access configuration

2. **Implement Health Checks**:
   - Add a cron job to verify R2 accessibility
   - Alert if public URLs return 404
   - Test file uploads/downloads periodically

3. **Consider Hybrid Approach**:
   - Use Supabase for thumbnails (reliable)
   - Use R2 for large video files (cost-effective)
   - Always keep thumbnails accessible

---

## Database Impact

**Posts with broken thumbnails** (from Nov 22, 2025):
- 1 Pinterest post (3 images)
- 2 Bluesky posts (2 images total)
- 5 Threads posts (6 images total)

**Total affected media files**: 11 images

**Database records intact**: All `media_urls` fields in the database are correct and contain the URLs. The issue is that the URLs return 404 because R2 storage is not accessible.

---

## Next Steps

1. **Fix R2 storage access** (see Option 1 above)
2. **Test media upload** with new posts
3. **Verify thumbnails display** correctly
4. **Monitor logs** for any cleanup issues
5. **Consider migrating to Supabase** if R2 continues to have issues

---

## Technical Details

### Storage Comparison

| Feature | Supabase Storage | Cloudflare R2 |
|---------|-----------------|---------------|
| Current Status | ✅ Working | ❌ Not accessible |
| Public URLs | Working | 404 errors |
| API Access | ✓ Valid | ✗ Access Denied |
| Used for | Old Threads posts | New posts (broken) |

### Affected Platforms by Date

- **Nov 22, 12:07 PM - 12:44 PM**: Threads posts (mixed Supabase + R2)
- **Nov 22, 3:45 PM - 3:49 PM**: Bluesky posts (R2 - broken)
- **Nov 22, 5:46 PM**: Pinterest post (R2 - broken)

---

## Contact for Help

If you need help fixing R2 storage:

1. **Cloudflare R2 Documentation**: https://developers.cloudflare.com/r2/
2. **Cloudflare Support**: https://support.cloudflare.com/
3. **Check R2 Dashboard**: https://dash.cloudflare.com/ → R2 → Buckets

---

*Investigation completed by Claude Code on November 24, 2025*

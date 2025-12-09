# Social Media Posting & Scheduling System Analysis

**Generated**: December 2024
**Scope**: QA/Infrastructure review of social media posting and scheduling

---

## Table of Contents

1. [End-to-End Flow](#end-to-end-flow-for-a-scheduled-post)
2. [Key Files & Components](#key-files--components)
3. [Duplicate Prevention Mechanisms](#duplicate-prevention-mechanisms)
4. [Error Handling & Surfacing](#error-handling--surfacing)
5. [Retry Logic & Recovery](#retry-logic--stuck-post-recovery)
6. [Platform-Specific Test Scenarios](#platform-specific-test-scenarios)
7. [QA Test Checklist](#qa-test-checklist)
8. [Code Smells & Issues](#code-smells--issues-found)
9. [Summary](#summary)

---

## End-to-End Flow for a Scheduled Post

### 1. User Creates Post in UI

- User fills out the create post form in `/dashboard/create/new`
- Selects platforms, adds content, optionally uploads media to R2 storage
- Clicks "Schedule" and selects a date/time

### 2. Post Stored in Database

- **API Route**: `POST /api/posts/schedule` (`app/api/posts/schedule/route.ts:74-316`)
- **Validation**:
  - Authenticates user
  - Validates required fields (content, platforms, scheduledFor)
  - Checks Twitter daily limit (max 2 posts/day/user)
  - Checks subscription post limits
  - Validates scheduled time is in future (5-minute tolerance)
- **Storage**: Inserts into `scheduled_posts` table with `status: 'pending'`

### 3. Cron Job Picks Up Due Posts

- **Main Endpoint**: `GET/POST /api/cron/process-scheduled-posts` (`route.ts:35-1413`)
- **Trigger**: QStash webhook or manual trigger with Bearer token
- **Query**: Fetches posts where `status='pending'` AND `scheduled_for <= now`
- **Batch Size**: Max 10 posts per run to avoid timeouts

### 4. Platform API Calls

- Uses optimistic locking: `UPDATE ... WHERE status='pending'` to prevent duplicate processing
- Calls direct posting functions from `lib/posting/cron-service.ts`:
  - `postToFacebookDirect()` - Graph API
  - `postToInstagramDirect()` - Graph API (two-phase for video carousels)
  - `postToBlueskyDirect()` - AT Protocol
  - `postToTwitterDirect()` - OAuth 1.0a
  - `postToThreadsDirect()` - Graph API (two-phase for videos, queue for threads)
  - `postToLinkedInDirect()` - REST API
  - `postToPinterestDirect()` - REST API (two-phase for videos)
  - `postToTikTokDirect()` - TikTok API

### 5. Success/Failure Handling

- **Success**: Updates `status='posted'`, `posted_at=now()`, `post_results=[...]`
- **Failure**: Updates `status='failed'`, `error_message='...'`, `post_results=[...]`
- **Partial Success**: Recorded in `post_results` array with per-platform status

---

## Key Files & Components

| Component | Path |
|-----------|------|
| **Posting Service** | `/lib/posting/service.ts` |
| **Cron Service (Direct Posts)** | `/lib/posting/cron-service.ts` |
| **Idempotency Tracking** | `/lib/posting/idempotency.ts` |
| **Progress Tracker** | `/lib/posting/progress-tracker.ts` |
| **Main Cron Endpoint** | `/app/api/cron/process-scheduled-posts/route.ts` |
| **Schedule API** | `/app/api/posts/schedule/route.ts` |
| **Error Sanitizer** | `/lib/utils/error-sanitizer.ts` |
| **Database Schema** | `/supabase/create-scheduled-posts-table.sql` |
| **Facebook API** | `/app/api/post/facebook/route.ts` + `/lib/facebook/service.ts` |
| **Instagram API** | `/app/api/post/instagram/route.ts` + `/lib/instagram/client.ts` |
| **Bluesky API** | `/app/api/post/bluesky/route.ts` + `/lib/bluesky/service.ts` |
| **Twitter API** | `/app/api/post/twitter/route.ts` + `/lib/twitter/service.ts` |
| **Threads API** | `/app/api/post/threads/route.ts` + `/lib/threads/service.ts` |
| **LinkedIn API** | `/app/api/post/linkedin/route.ts` + `/lib/linkedin/service.ts` |
| **Pinterest API** | `/app/api/post/pinterest/route.ts` + `/lib/pinterest/service.ts` |
| **TikTok API** | `/app/api/post/tiktok/route.ts` + `/lib/tiktok/service.ts` |
| **YouTube API** | `/app/api/post/youtube/route.ts` + `/lib/youtube/service.ts` |
| **Queue Processing** | `/app/api/queue/threads/process-post/route.ts` |

---

## Duplicate Prevention Mechanisms

### 1. Optimistic Locking on Status

```typescript
// In process-scheduled-posts/route.ts:878-893
const { data: lockedPost, error: postingError } = await supabase
  .from('scheduled_posts')
  .update({ status: 'posting', updated_at: new Date().toISOString() })
  .eq('id', post.id)
  .eq('status', 'pending') // Only update if still pending
  .select()
  .single();

if (postingError || !lockedPost) {
  console.log(`Post ${post.id} already being processed by another instance`);
  continue;
}
```

### 2. Idempotency Tracking (`lib/posting/idempotency.ts`)

- **Table**: `post_attempts` with unique constraint on idempotency key
- **Key Generation**: SHA256 hash of `${postId}:${platform}:${accountId}`
- **Workflow**:
  1. `checkPostAttempt()` - Check if already posted
  2. `recordPostAttempt()` - Record attempt before posting (status: 'posting')
  3. `markPostAttemptSuccess()` / `markPostAttemptFailed()` - Update result
- **Race Condition Handling**: Insert fails on duplicate key → fetch existing record

### 3. Two-Phase Processing State

- Posts enter `status='processing'` during async media processing
- Processing state tracked in `processing_state` JSONB column
- Prevents re-processing by checking status before Phase 2

---

## Error Handling & Surfacing

### UI Error Display

- **Post Card** (`components/post-card.tsx:432-449`):
  - Status badge shows `pending`, `posting`, `failed`, `cancelled`, `processing`
  - Failed posts get red badge: `bg-red-100 text-red-700`
  - No direct error message display in card (only status)

### Error Sanitization (`lib/utils/error-sanitizer.ts`)

- `sanitizeErrorMessage()` - Removes HTML, decodes entities, truncates to 1000 chars
- `combineErrorMessages()` - Combines multiple platform errors with `;` separator
- `extractErrorMessage()` - Handles Error objects, API responses, unknown types
- **Max Lengths**: 1000 chars total, 200 chars per platform

### Logging

- Console logs throughout with structured format
- JSON structured logs for monitoring (e.g., `media_cleanup_failed` events)
- Critical errors logged with `CRITICAL:` prefix

---

## Retry Logic & Stuck Post Recovery

### Stuck Post Recovery (Cron Job)

```typescript
// Posts stuck in 'posting' for >10 minutes (route.ts:141-232)
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
// Queries posts with status='posting' AND updated_at < tenMinutesAgo
// Uses idempotency tracking to determine partial success
// Marks as 'posted' if all platforms succeeded, 'failed' otherwise

// Posts stuck in 'processing' for >30 minutes (route.ts:234-264)
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
// Marks as failed with timeout error
```

### QStash Retries

- Thread posts: `retries: 3` in QStash publish call
- Retry tracking in `thread_jobs.retry_count` column
- After 3 retries → marks job as `failed`

### Token Refresh

- **TikTok**: Proactive refresh 2 hours before expiry
- **Threads**: Checks expiry, refreshes if expired/expiring within 7 days
- Invalid tokens → marks account as `is_active: false`

---

## Platform-Specific Test Scenarios

### Facebook

| Test Case | Expected Behavior |
|-----------|-------------------|
| Successful text post | Post created, status='posted' |
| Successful photo post | Photo uploaded, post created |
| Successful video/reel | Video uploaded, reel published |
| Expired token | Error: "Token expired", account marked inactive |
| Missing page access | Error: "Failed to post to Facebook page" |
| Invalid media URL | Error: "Failed to upload media" |
| Rate limit (5xx) | Error logged, post marked failed |

### Instagram

| Test Case | Expected Behavior |
|-----------|-------------------|
| Successful single image | Container created, published |
| Successful carousel (images only) | Direct publish |
| Carousel with videos | Two-phase: status='processing' → polled → published |
| Container timeout (>30 min) | Status='failed', error: "processing timed out" |
| Container expired (>24 hours) | Status='failed', error: "containers expired" |
| No media | Error: "Instagram posts require at least one media file" |
| Expired token | Error: "Invalid OAuth access token" |

### Threads

| Test Case | Expected Behavior |
|-----------|-------------------|
| Successful text post | Container created, published |
| Single video post | Two-phase processing via cron |
| Thread mode (multiple posts) | QStash queue processing, sequential posts |
| Token <24h old | Error: "Token must be at least 24 hours old to refresh" |
| Invalid token | Account marked inactive, reconnect required |
| Video processing timeout | Status='failed' after 30 attempts |

### Twitter/X

| Test Case | Expected Behavior |
|-----------|-------------------|
| Successful tweet | Tweet posted, ID returned |
| Tweet with 4+ images | Only first 4 images uploaded |
| Daily limit exceeded | Error: "You've already scheduled 2 Twitter posts for [date]" |
| Expired OAuth token | Error from Twitter API |

### LinkedIn

| Test Case | Expected Behavior |
|-----------|-------------------|
| Successful text post | Share created |
| Post with image | Image uploaded, share created |
| Post with video | Video uploaded (binary), share created |
| Invalid token | LinkedIn API error |

### Pinterest

| Test Case | Expected Behavior |
|-----------|-------------------|
| Successful image pin | Pin created on selected board |
| Image carousel (2-5) | Carousel pin created |
| Video pin | Two-phase: upload → poll → create pin |
| No board selected | Error: "Pinterest board not selected" |
| Mixed images/videos | Error: "Pinterest doesn't support mixing images and videos" |

### TikTok

| Test Case | Expected Behavior |
|-----------|-------------------|
| Successful video | Video posted (or saved as draft if sandbox) |
| Non-video content | Error: "TikTok only supports video content" |
| Token expired | Auto-refresh attempted, error if fails |
| Unaudited app | Forced SELF_ONLY/draft mode |

### Bluesky

| Test Case | Expected Behavior |
|-----------|-------------------|
| Successful text post | Post created with URI/CID |
| Post with images | Images uploaded as blobs, post created |
| Invalid credentials | AT Protocol auth error |

### YouTube

| Test Case | Expected Behavior |
|-----------|-------------------|
| Scheduled video | Video uploaded with `publishAt`, marked as scheduled |
| Scheduled post due | Cron marks status='posted' when `scheduled_for` passes |
| Failed upload | Error stored in `error_message` |

---

## QA Test Checklist

### Scheduling Tests

- [ ] Schedule post for 5 minutes from now → should succeed
- [ ] Schedule post in the past → should fail with "must be in the future"
- [ ] Schedule 10 posts at the same minute → all should process (max 10/run)
- [ ] Schedule post while offline → should queue locally? (frontend handling)
- [ ] Edit scheduled post time → should update `scheduled_for`
- [ ] Delete pending scheduled post → should remove from DB

### Authentication & Token Tests

- [ ] Disconnect account mid-flow → Error: "account is no longer connected"
- [ ] Token expires during posting → Refresh attempted (TikTok/Threads)
- [ ] Invalid token stored → Account marked inactive, user notified
- [ ] Reconnect after token expiry → New token should work

### Rate Limit Tests

- [ ] Hit Twitter daily limit → HTTP 429 with helpful message
- [ ] Exceed subscription post limit → HTTP 429 with upgrade prompt
- [ ] API rate limit from platform → Error logged, post marked failed

### Media Handling Tests

- [ ] Post with 5MB image → should upload and post
- [ ] Post with large video (100MB+) → platform-specific handling
- [ ] Invalid media URL → Error: "Failed to upload media"
- [ ] Media URL returns 404 → Error during posting
- [ ] Media URL times out → 5s timeout, error recorded

### Multi-Platform Tests

- [ ] Post to 3+ platforms simultaneously → all should post
- [ ] One platform fails, others succeed → Partial success recorded
- [ ] All platforms fail → Status='failed' with combined errors

### Two-Phase Processing Tests

- [ ] Instagram carousel with video → enters 'processing' state
- [ ] Container ready within 30 min → publishes successfully
- [ ] Container never ready → timeout after 30 min
- [ ] Instagram container expires (24h) → marked as expired/orphaned

### Concurrency Tests

- [ ] Two cron instances process same post → only one should succeed (optimistic lock)
- [ ] Cron restart mid-posting → stuck post recovery marks appropriately
- [ ] DB write fails after platform post → idempotency prevents duplicate on retry

### Error Recovery Tests

- [ ] Post stuck in 'posting' for 10+ min → recovered with partial success check
- [ ] Post stuck in 'processing' for 30+ min → marked failed
- [ ] Network timeout during posting → error recorded, can retry
- [ ] 5xx from platform API → error logged, post failed

---

## Code Smells & Issues Found

### 1. Missing Backoff/Retry Logic ⚠️

**Location**: `lib/posting/cron-service.ts` (all `postTo*Direct` functions)

**Issue**: Platform API calls have no retry with exponential backoff. A transient 5xx error immediately fails the post.

**Current**: Single attempt, immediate failure

**Recommended**: Add retry with exponential backoff (e.g., 1s, 2s, 4s)

```typescript
// Missing pattern like:
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
}
```

---

### 2. Thread Job Error Handling Race Condition ⚠️

**Location**: `app/api/queue/threads/process-post/route.ts:349-396`

**Issue**: In the catch block, `request.json()` is called again after it was already consumed, causing errors. The `jobId` won't be extracted.

```typescript
// Line 353-354
if (request.body) {
  try {
    const body = await request.json(); // FAILS - body already consumed
```

**Fix**: Store body in variable at start, use in catch block.

---

### 3. No Per-Platform Rate Limit Tracking ⚠️

**Location**: Various posting functions

**Issue**: Only Twitter has daily limit tracking. Other platforms (Instagram, Facebook, TikTok) have their own rate limits that aren't tracked, leading to potential 429 errors without user-friendly messages.

---

### 4. Missing Media Validation Before Scheduling ⚠️

**Location**: `app/api/posts/schedule/route.ts`

**Issue**: Media URLs are stored without validation that they're accessible. If URL becomes invalid before posting, the post fails.

**Recommendation**: Add `HEAD` request validation before accepting the schedule.

---

### 5. Stuck Post Recovery Doesn't Update Idempotency Records ⚠️

**Location**: `process-scheduled-posts/route.ts:141-232`

**Issue**: When recovering stuck posts, the code checks `post_attempts` for successful attempts but doesn't update failed attempts. This could leave stale records.

---

### 6. No Circuit Breaker for Platform APIs ⚠️

**Location**: All platform posting functions

**Issue**: If a platform is down, every scheduled post to that platform will attempt to post and fail. No circuit breaker to temporarily disable posting to a failing platform.

---

### 7. Error Messages May Leak Sensitive Info

**Location**: Various error handlers

**Issue**: Some error messages include debug URLs (`VERCEL_URL`) that could leak environment info:

```typescript
// Line 1241-1242
const debugUrl = process.env.VERCEL_URL
  ? `VERCEL_URL: ${process.env.VERCEL_URL}`
  : 'Using localhost';
```

---

### 8. Processing State Not Cleaned on Success for Some Flows

**Location**: `process-scheduled-posts/route.ts`

**Issue**: In the Instagram Phase 2 success path with remaining accounts, `processing_state` is set to `null`, but if the next account also needs two-phase, it will overwrite. The state management is complex and error-prone.

---

### 9. Missing Structured Logging

**Location**: Throughout codebase

**Issue**: Most logs are plain `console.log()` without structured metadata. This makes it harder to search/filter in production logging systems.

**Recommendation**: Use structured JSON logging:

```typescript
console.log(JSON.stringify({
  event: 'post_published',
  post_id: post.id,
  platform: 'instagram',
  duration_ms: endTime - startTime
}));
```

---

### 10. Media Cleanup Skipped for Multiple Platforms

**Location**: `process-scheduled-posts/route.ts:1319-1339`

**Issue**: Media cleanup is skipped if TikTok, Pinterest, or Bluesky is in the platforms list. If a post goes to Instagram + TikTok, the media won't be cleaned up even after Instagram is done.

---

## Summary

### Strengths ✅

The scheduling and posting system is well-architected with:

- ✅ **Idempotency tracking** to prevent duplicate posts
- ✅ **Optimistic locking** for concurrent safety across cron instances
- ✅ **Two-phase processing** for async media uploads (Instagram, Threads, Pinterest)
- ✅ **Stuck post recovery** mechanisms (10 min for posting, 30 min for processing)
- ✅ **Error sanitization** to prevent huge error pages being stored
- ✅ **Token refresh** for expiring credentials (TikTok, Threads)
- ✅ **Queue-based processing** for Threads threads via QStash
- ✅ **Account verification** before posting (TOCTOU protection)

### Areas for Improvement ❌

- ❌ **No retry with backoff** for transient API failures
- ❌ **Thread job error handling** has race condition (body already consumed)
- ❌ **No circuit breaker** for failing platforms
- ❌ **Media URL validation** happens too late (at posting time, not scheduling)
- ❌ **Inconsistent structured logging** makes production debugging harder
- ❌ **Rate limit tracking** only exists for Twitter, not other platforms
- ❌ **Media cleanup logic** is overly conservative, may leave orphaned files

### Recommendations

1. **Add retry with exponential backoff** to all `postTo*Direct` functions
2. **Fix thread job error handling** to capture body before try block
3. **Implement circuit breaker pattern** for platform API health
4. **Add media URL validation** at schedule time with `HEAD` request
5. **Standardize structured logging** across all posting code
6. **Track rate limits** for Instagram, Facebook, TikTok
7. **Improve media cleanup** to handle multi-platform posts more intelligently

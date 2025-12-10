# Analytics Data Quality Audit Report

**Generated:** December 2024
**Auditor:** Data Quality QA Engineer
**Scope:** All analytics/insights functionality in SocialCal

---

## Table of Contents

1. [Social API Metric Sources & Calculations](#1-social-api-metric-sources--calculations)
2. [Database Storage](#2-database-storage)
3. [Derived Metrics Calculations](#3-derived-metrics-calculations)
4. [Potential Issues & Brittle Logic](#4-potential-issues--brittle-logic)
5. [Manual Data Validation Plan](#5-manual-data-validation-plan)
6. [10 Manual Checks for Analytics Trustworthiness](#6-10-manual-checks-for-analytics-trustworthiness)
7. [Recommendations](#7-recommendations)

---

## 1. Social API Metric Sources & Calculations

### A. Facebook (`/app/api/analytics/facebook/route.ts`)

| Metric | API Source | Calculation |
|--------|------------|-------------|
| `likes` | Hardcoded to `0` | Not fetched (excluded to prevent Instagram cross-post exclusion) |
| `comments` | Hardcoded to `0` | Same reason as above |
| `shares` | `post.shares.count` | Direct from API |
| `reactions` | Hardcoded to `0` | Not fetched |
| `reach` | `post_media_view` insight | From `/posts/{id}/insights?metric=post_media_view` |
| `impressions/views` | `post_media_view` OR `/videos` endpoint | Video views preferred, fallback to post_media_view |
| `totalEngagement` | `likes + comments + shares + reactions` | **ALWAYS 0 + 0 + shares + 0 = shares only** |

**Edge Cases:**
- **Division by zero:** Not directly applicable here (no rate calculations)
- **Missing fields:** Uses `?? 0` fallback
- **Deprecation risk:** Uses `post_media_view` (Meta's Nov 2025 replacement for deprecated `post_impressions`)

---

### B. Instagram (`/app/api/analytics/instagram/route.ts`)

| Metric | API Source | Calculation |
|--------|------------|-------------|
| `likes` | `media.like_count` | Direct from API |
| `comments` | `media.comments_count` | Direct from API |
| `saves` | `/insights?metric=saved` | From insights API |
| `reach` | `/insights?metric=reach` | From insights API |
| `views` | `/insights?metric=views` | Replaced deprecated `plays` metric (April 2025) |
| `impressions` | `views \|\| reach` | Fallback to reach if views unavailable |
| `totalEngagement` | `likes + comments + saves` | Direct sum |

**Edge Cases:**
- **Missing insights:** Falls back to 0 for each metric
- **Token expiration:** Logged but doesn't deactivate account automatically

---

### C. Threads (`/app/api/analytics/threads/route.ts`)

| Metric | API Source | Calculation |
|--------|------------|-------------|
| `likes`, `replies`, `reposts`, `quotes`, `views` | `/insights?metric=views,likes,replies,reposts,quotes` | From insights API |
| `totalEngagement` | `likes + replies + reposts + quotes` | Direct sum |
| `totalReach` | Same as `totalViews` | Views used as reach proxy |

**Edge Cases:**
- **3-second timeout:** Insights requests timeout quickly, may miss data
- **Missing insights:** Falls back to 0

---

### D. Bluesky (`/app/api/analytics/bluesky/route.ts`)

| Metric | API Source | Calculation |
|--------|------------|-------------|
| `likes` | `post.likeCount` | Direct from AT Protocol |
| `reposts` | `post.repostCount` | Direct from API |
| `replies` | `post.replyCount` | Direct from API |
| `quotes` | `post.quoteCount` | Direct from API |
| `totalEngagement` | `likes + reposts + replies + quotes` | Direct sum |
| `totalReach` | `likes + reposts` | **ESTIMATED - no real reach data available** |

**Edge Cases:**
- **No impressions/reach:** Bluesky AT Protocol doesn't provide view counts
- **Rate limiting:** 30-minute session cache to avoid 429 errors

---

### E. Pinterest (`/app/api/analytics/pinterest/route.ts`)

| Metric | API Source | Calculation |
|--------|------------|-------------|
| `saves` | `/pins/{id}/analytics?metric_types=SAVE` | Daily breakdown summed |
| `pin_clicks` | `PIN_CLICK` metric | Daily breakdown summed |
| `impressions` | `IMPRESSION` metric | Daily breakdown summed |
| `outbound_clicks` | `OUTBOUND_CLICK` metric | Daily breakdown summed |
| `totalEngagement` | `saves + pin_clicks + outbound_clicks` | Direct sum |
| `totalReach` | Same as `impressions` | Impressions used as reach proxy |

**Edge Cases:**
- **data_status check:** Only includes metrics with `READY` status
- **Pagination:** Limited to 5 pages (~500 pins)

---

### F. TikTok (`/app/api/analytics/tiktok/route.ts`)

| Metric | API Source | Calculation |
|--------|------------|-------------|
| `likes` | `video.metrics.likes` | From internal `/api/tiktok/media` endpoint |
| `comments` | `video.metrics.comments` | From internal endpoint |
| `shares` | `video.metrics.shares` | From internal endpoint |
| `views` | `video.metrics.views` | From internal endpoint |
| `totalEngagement` | `likes + comments + shares` | Direct sum |
| `totalReach` | Same as `views` | Views used as reach proxy |

**Edge Cases:**
- **15-second timeout:** May miss data on slow responses
- **Token/scope errors:** Logged but not handled gracefully

---

### G. YouTube (`/app/api/analytics/youtube/route.ts`)

| Metric | API Source | Calculation |
|--------|------------|-------------|
| `likes` | `video.statistics.likeCount` | Parsed from string |
| `comments` | `video.statistics.commentCount` | Parsed from string |
| `shares` | Hardcoded to `0` | **NOT AVAILABLE from YouTube API** |
| `views` | `video.statistics.viewCount` | Parsed from string |
| `totalEngagement` | `likes + comments + shares` | **shares is always 0** |
| `totalReach` | Same as `views` | Views used as reach proxy |

**Edge Cases:**
- **Quota limits:** Error handling for quota exceeded
- **Batch processing:** 50 videos per API call, max 200 videos

---

## 2. Database Storage

### Analytics Snapshots Table (`analytics_snapshots`)

```sql
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  account_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  metrics JSONB NOT NULL,  -- Platform-specific metrics stored as flexible JSONB
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, platform, account_id, snapshot_date)
);
```

### What's Stored (per `snapshot-analytics/route.ts`)

| Platform | Stored Metrics |
|----------|---------------|
| Facebook | `impressions, engagement, reach, page_views(0), followers(0)` |
| Instagram | `reach, likes, comments, saves, shares` |
| Threads | `views, likes, replies, reposts, quotes` |
| TikTok | `follower_count, following_count, likes_count, video_count` |
| Pinterest | `saves, pin_clicks, impressions, outbound_clicks` |
| Bluesky | `likes, reposts, replies, quotes` |

### Issues Identified

1. **Instagram snapshot aggregation accesses wrong field:** `post.metrics?.reach` but posts have `post.reach` directly
2. **Threads snapshot aggregation accesses wrong field:** `post.metrics?.views` but posts have `post.views` directly
3. **TikTok snapshots store account-level metrics**, not post metrics (inconsistent with other platforms)

---

## 3. Derived Metrics Calculations

### Engagement Rate

**Location:** `page.tsx:501, 555, 693-698`

```typescript
// Main calculation
engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0

// Trend calculation
engagementRate = totalImpressions > 0
  ? (totalEngagement / totalImpressions) * 100
  : 0
```

**Issues:**
1. **Inconsistency:** Main view uses `totalReach`, trend uses `totalImpressions`
2. **Division by zero:** Handled with `> 0` check, returns 0

---

### Percentage Change

**Location:** `comparison.ts:26-29, trends/route.ts:18-24`

```typescript
// In comparison.ts
if (!previous || previous === 0) return 0

// In trends/route.ts
if (previous === 0 && current === 0) return 0
if (previous === 0) return null
return ((current - previous) / previous) * 100
```

**Issues:**
1. **Inconsistent handling:** `comparison.ts` returns `0` when previous is zero; `trends/route.ts` returns `null`
2. **Semantic difference:** Returning 0 vs null has different meaning for UI

---

### Platform-Specific Engagement Aggregation

**Location:** `page.tsx:524-593`

Different calculation logic per platform:

| Platform | Engagement Formula |
|----------|-------------------|
| Facebook | `post.engagement \|\| post.totalEngagement` |
| Instagram | `likes + comments + saves` |
| Threads | `likes + replies + reposts + quotes` |
| Bluesky | `likes + replies + reposts` |
| Pinterest | `saves + pin_clicks + outbound_clicks` |
| TikTok | `likes + comments + shares` |
| YouTube | `likes + comments + shares` |

---

## 4. Potential Issues & Brittle Logic

### A. Hard-coded Metric Names at Risk of Deprecation

| Location | Metric | Risk Level |
|----------|--------|------------|
| `facebook/route.ts:149` | `post_media_view` | Medium - New as of Nov 2025 |
| `facebook/route.ts:229` | `page_media_view` | Medium - New API |
| `instagram/route.ts:146` | `views` | Low - Replaced `plays` April 2025 |
| `threads/route.ts:122` | `views,likes,replies,reposts,quotes` | Medium - Threads API is newer |

---

### B. Pagination Issues

| Platform | Issue |
|----------|-------|
| Facebook | Only fetches first 100 posts, no pagination handling |
| Pinterest | Limited to 5 pages, may miss older pins in long date ranges |
| YouTube | Stops early if videos are out of date range (assumes chronological order) |
| Bluesky | Fixed limit of 100, no pagination |

---

### C. Date Range/Timezone Issues

**1. Frontend date filtering** (`page.tsx:506-513`):
```typescript
const currentPeriodStart = new Date();
currentPeriodStart.setDate(currentPeriodStart.getDate() - parseInt(dateRange));
// No timezone normalization - uses browser timezone
```

**2. Backend date filtering** (`instagram/route.ts:45-48`):
```typescript
const since = new Date();
since.setDate(since.getDate() - days);
// Uses server timezone
```

**3. Pinterest date filtering** uses `toISOString().split('T')[0]` which converts to UTC

**Potential Mismatch:**
- User in PST views "Last 7 days"
- Frontend filters from browser time
- Backend filters from server time (likely UTC)
- Pinterest API filters from UTC midnight
- Could cause up to 1-day discrepancy at period boundaries

---

### D. Missing Field Handling

Most routes use `?? 0` or `|| 0` fallback, but some inconsistencies:

| Location | Code | Issue |
|----------|------|-------|
| `facebook/route.ts:183` | `reach: finalReach` | Could be `null` |
| `bluesky/route.ts:157` | `post.likeCount \|\| 0` | Works correctly |
| `youtube/route.ts:186-189` | `parseInt(stats.likeCount \|\| '0')` | Could fail on non-numeric |

---

### E. API Version Pinning

| Platform | Version | Risk |
|----------|---------|------|
| Facebook | `v21.0` | Should update periodically |
| Instagram | `v22.0` | Recently updated |
| Threads | `v1.0` | Stable |
| YouTube | `v3` | Stable |
| Pinterest | `v5` | Current |

---

## 5. Manual Data Validation Plan

### Test Accounts Needed

- 1 Facebook Page with recent posts
- 1 Instagram Business/Creator account
- 1 Threads account
- 1 YouTube channel
- 1 Pinterest business account
- 1 Bluesky account
- 1 TikTok creator account

### Validation Process

For each platform, compare metrics for **the same 7-day period**:

| Our App | Native Dashboard | Acceptable Tolerance |
|---------|-----------------|---------------------|
| Post count | Native post count | Exact match |
| Total likes | Sum from native | ±5% (API lag) |
| Total comments | Sum from native | ±5% |
| Total reach | Native reach | ±10% (different counting methods) |
| Total impressions | Native impressions | ±10% |
| Engagement rate | Calculated manually | ±0.5% absolute |

### Expected Tolerance Factors

1. **API Lag:** Social APIs may take 24-48 hours to finalize metrics
2. **Timezone shifts:** Could cause ±1 day discrepancy
3. **Unique vs Total:** Some platforms count unique users, others total actions
4. **Calculation differences:** Native dashboards may use different formulas

---

## 6. 10 Manual Checks for Analytics Trustworthiness

### Check 1: Post Count Accuracy

Compare total posts shown in SocialCal with native platform's "Posts" count for the same date range. Should match exactly.

**Steps:**
1. Open SocialCal Analytics for 7-day view
2. Note post count per platform
3. Open each native dashboard (Instagram Insights, FB Studio, etc.)
4. Compare post counts for same period

**Pass Criteria:** Exact match

---

### Check 2: Single Post Deep Dive

Pick one post from each platform. Compare likes/comments/shares in SocialCal vs the native post detail view. Should be within 5%.

**Steps:**
1. Select a recent post in SocialCal's "Top Posts"
2. Find same post in native app
3. Compare each metric

**Pass Criteria:** Within 5% for each metric

---

### Check 3: Engagement Rate Sanity Check

Calculate manually: `(Total Engagement / Total Reach) * 100`. Compare with displayed rate. Should match to 2 decimal places.

**Steps:**
1. Note Total Engagement and Total Reach from SocialCal
2. Calculate rate manually
3. Compare with displayed Engagement Rate

**Pass Criteria:** Match to 2 decimal places

---

### Check 4: Timezone Boundary Test

Post content at 11pm local time. Verify it appears in "Today" in both native dashboard and SocialCal.

**Steps:**
1. Schedule or publish post at 11pm local time
2. Check native platform - confirm it shows as "today"
3. Check SocialCal - confirm it shows in current period

**Pass Criteria:** Post appears in correct time period on both

---

### Check 5: Empty State Handling

Disconnect all accounts, verify analytics shows zeros and preview data banner (not errors or NaN).

**Steps:**
1. Disconnect all social accounts from Settings
2. Navigate to Analytics page
3. Verify preview banner is shown
4. Verify no NaN, undefined, or error messages

**Pass Criteria:** Clean zero state with preview banner

---

### Check 6: Trend Calculation Verification

For 7-day view, manually sum metrics from days 1-7 (current) and days 8-14 (previous). Verify change % is `((current-previous)/previous)*100`.

**Steps:**
1. Export analytics data (CSV)
2. Sum current period metrics
3. Sum previous period metrics
4. Calculate expected change percentage
5. Compare with displayed trend

**Pass Criteria:** Match within 1%

---

### Check 7: Facebook Engagement Cross-Check

Since likes/comments are hardcoded to 0, verify that Facebook posts only show share counts. Document this as a known limitation.

**Steps:**
1. View Facebook posts in Analytics
2. Check engagement breakdown
3. Confirm only shares are counted

**Pass Criteria:** Acknowledged limitation, shares only

---

### Check 8: Bluesky Reach Estimation

Verify Bluesky "reach" is clearly labeled as estimated, since actual reach isn't available from AT Protocol.

**Steps:**
1. View Bluesky metrics in platform breakdown
2. Check if reach is noted as estimated
3. Verify calculation matches `likes + reposts`

**Pass Criteria:** Clear indication that reach is estimated

---

### Check 9: YouTube Shares Missing

Confirm YouTube shows 0 shares for all videos. Document this as API limitation.

**Steps:**
1. View YouTube posts in Analytics
2. Check shares count for multiple videos
3. Confirm all show 0

**Pass Criteria:** Acknowledged limitation, 0 shares expected

---

### Check 10: Date Range Consistency

Switch between 7/30/90 day views rapidly. Verify metrics update correctly, post counts increase with longer ranges, and no cached stale data appears.

**Steps:**
1. Note metrics for 7-day view
2. Switch to 30-day view - verify increase
3. Switch to 90-day view - verify further increase
4. Switch back to 7-day - verify matches original
5. Repeat rapidly several times

**Pass Criteria:** Consistent, increasing metrics; no stale data

---

## 7. Recommendations

### High Priority

| # | Issue | Recommendation |
|---|-------|----------------|
| 1 | Inconsistent engagement rate calculation | Use same denominator (reach vs impressions) across all calculations |
| 2 | Snapshot aggregation uses wrong field paths | Fix Instagram/Threads to use `post.reach` and `post.views` directly |
| 3 | No timezone normalization | Convert all dates to UTC before comparison |
| 4 | Undocumented limitations | Add UI indicators for Facebook (missing likes), YouTube (missing shares), Bluesky (estimated reach) |

### Medium Priority

| # | Issue | Recommendation |
|---|-------|----------------|
| 5 | Limited pagination | Add full pagination for Facebook/Bluesky/TikTok to capture complete history |
| 6 | No data freshness indicator | Show when data was last fetched from each platform |
| 7 | Inconsistent null/0 handling | Standardize percentage change to return `null` (not `0`) when previous is zero |

### Low Priority

| # | Issue | Recommendation |
|---|-------|----------------|
| 8 | API version monitoring | Add automated alerts when new API versions are available |
| 9 | No metric validation | Flag impossible values (negative counts, >100% rates) |
| 10 | No confidence scoring | Add data quality dashboard showing confidence scores per platform |

---

## Appendix: File References

| File | Purpose |
|------|---------|
| `/app/dashboard/analytics/page.tsx` | Main analytics page (1167 lines) |
| `/app/api/analytics/facebook/route.ts` | Facebook metrics fetcher |
| `/app/api/analytics/instagram/route.ts` | Instagram metrics fetcher |
| `/app/api/analytics/threads/route.ts` | Threads metrics fetcher |
| `/app/api/analytics/bluesky/route.ts` | Bluesky metrics fetcher |
| `/app/api/analytics/pinterest/route.ts` | Pinterest metrics fetcher |
| `/app/api/analytics/tiktok/route.ts` | TikTok metrics fetcher |
| `/app/api/analytics/youtube/route.ts` | YouTube metrics fetcher |
| `/app/api/analytics/trends/route.ts` | Trend calculation API |
| `/app/api/cron/snapshot-analytics/route.ts` | Daily snapshot cron job |
| `/lib/analytics/comparison.ts` | Snapshot comparison utilities |
| `/supabase/migrations/20250117000000_create_analytics_snapshots.sql` | Database schema |

---

*End of Audit Report*

# Complete Fix Plan: Social Scheduler to 100% Working State

## Current State Assessment

### ✅ What's Working:
1. **Build System**: The project builds successfully with Next.js 14
2. **Core Infrastructure**: Supabase database, authentication, and storage are configured
3. **Social Media Integrations**: Facebook, Bluesky, Instagram, TikTok, LinkedIn, Threads, Twitter, YouTube, Pinterest APIs are implemented
4. **Content Creation**: Rich text editor, media upload, multi-platform posting
5. **Scheduling System**: Database schema exists, cron jobs configured
6. **AI Features**: OpenAI integration for caption suggestions
7. **Billing Infrastructure**: Stripe integration exists with checkout and webhooks

### ❌ What's Broken:

1. **Stripe Webhook Issues**:
   - Multiple webhook secrets (production + local) causing verification failures
   - Subscription status not syncing reliably after payment
   - 26+ subscription API debug endpoints indicate ongoing issues

2. **Database Consistency**:
   - Duplicate payment records
   - Stale subscription data (5-minute cache tolerance)
   - Multiple cleanup and fix endpoints suggest data integrity problems

3. **Subscription Gate Logic**:
   - Complex caching system may cause UI flash/flicker
   - Auto-sync conflicts with real-time updates
   - Session storage can get out of sync with database

4. **Social Media Platform Limitations**:
   - Twitter: Read-only (posting disabled due to API costs)
   - Instagram/Threads: Pending Meta app review
   - Pinterest: Sandbox mode, pending review
   - TikTok: Unaudited mode (draft posting only)

5. **Over-Engineering**:
   - Too many debug/fix API endpoints (26+)
   - Multiple sync mechanisms competing with each other
   - Complex auto-retry and fix logic that may cause race conditions

---

## Phase 1: Stripe & Billing Fixes (Critical) ✅ COMPLETED

### 1. Consolidate Webhook Handling ✅
- ✅ Removed duplicate webhook secret logic
- ✅ Use single STRIPE_WEBHOOK_SECRET (no fallback)
- ✅ Added proper webhook event logging with timing
- ✅ Improved error messages and debugging info

### 2. Fix Subscription Sync ✅
- ✅ Removed auto-sync on every page load (was causing race conditions)
- ✅ Single source of truth: Stripe webhooks update DB automatically
- ✅ Removed session storage cache (was causing stale data)
- ✅ Removed competing sync endpoints

### 3. Clean Up Debug Endpoints ✅
- ✅ Deleted 20+ temporary fix/debug/sync endpoints
- ✅ Kept only essential endpoints: cancel, cancel-scheduled, change-plan, payments, usage
- ✅ Documented Stripe CLI usage in .env.local

### 4. Fix Payment History ✅
- ✅ Created migration to remove duplicate payments
- ✅ Added unique constraint on stripe_invoice_id
- ✅ Added index for better query performance
- ✅ Webhook now records payments once per invoice

---

## Phase 2: Subscription Gate & UX ✅ COMPLETED

### 1. Simplify Subscription Provider ✅
- ✅ Removed session storage cache (was causing stale data)
- ✅ Single DB query, no competing syncs
- ✅ Improved loading state with proper skeleton UI

### 2. Fix Subscription Checking ✅
- ✅ Single source of truth from database
- ✅ Check status: `active` or `trialing` = has access
- ✅ Better error handling and user feedback

### 3. Improve Trial Handling ✅
- ✅ Added trial days remaining indicator on billing page
- ✅ Clear visual alert showing trial end date
- ✅ Automatic conversion from trial to paid via Stripe webhooks
- ✅ Better post-payment refresh flow

### 4. Added Manual Refresh Button ✅
- ✅ "Refresh Status" button on billing page
- ✅ Allows users to manually sync subscription status
- ✅ Shows loading state during refresh

---

## Phase 3: Social Media Platform Fixes

### 1. Document Platform Status
- Add status page showing which platforms are fully functional
- Show "Coming Soon" for platforms pending review
- Disable platforms that don't work yet

### 2. Twitter/X
- Either remove completely OR upgrade to paid API
- Current implementation is misleading (shows as option but doesn't work)

### 3. Instagram/Threads/Pinterest
- Add app review status indicator
- Show estimated approval timeline
- Enable once approved

### 4. TikTok
- Clear messaging: "Videos posted as drafts" until app approval
- Add instructions for finding drafts in TikTok app

---

## Phase 4: Cron & Scheduled Posts

### 1. Fix Vercel Cron Limitations
- Document: Hobby plan = hourly only
- Either upgrade to Vercel Pro OR use external cron (cron-job.org)
- Add queue system for minute-level scheduling

### 2. Test Scheduled Posting End-to-End
- Create test scheduled post
- Verify cron job runs
- Confirm post publishes correctly
- Check database status updates

---

## Phase 5: Testing & Validation

### 1. Complete User Flow Testing
- Signup → Login → Connect Platform → Create Post → Schedule → Post
- Subscribe → Payment → Feature Unlock → Billing Page
- Trial Start → Trial End → Convert to Paid

### 2. Error Handling Improvements
- Show clear error messages (not technical jargon)
- Add retry logic for transient failures
- Log errors to Sentry or similar service

### 3. Performance Optimization
- Remove unnecessary API calls on page load
- Optimize images with Next.js Image component
- Add loading skeletons instead of blank screens

---

## Success Criteria (100% Working):
- ✅ User can sign up and subscribe without issues
- ✅ Payment webhooks update subscription status within 5 seconds
- ✅ Billing page shows accurate data
- ✅ Users can post to ALL connected platforms successfully
- ✅ Scheduled posts publish at the correct time
- ✅ Platform status is clear (working, pending review, unavailable)
- ✅ Zero race conditions or data inconsistencies
- ✅ Clean codebase with no debug endpoints in production

---

## Estimated Timeline:
- **Phase 1 (Critical)**: 3-4 hours
- **Phase 2**: 2-3 hours
- **Phase 3**: 2 hours
- **Phase 4**: 2-3 hours
- **Phase 5**: 2-3 hours

**Total Time**: 11-15 hours of focused development

**Priority Order**: Phase 1 (Critical) → Phase 2 → Phase 3 → Phase 4 → Phase 5

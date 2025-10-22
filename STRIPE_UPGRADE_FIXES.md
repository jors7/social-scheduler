# Stripe Upgrade Flow - Critical Bug Fixes

**Date:** October 22, 2025
**Issues Found During Production Testing**

---

## 🐛 Bugs Discovered

### Bug #1: Missing Upgrade Payment in Payment History
**Symptom:** When user upgrades from Starter trial → Professional, the $19 payment doesn't appear in billing page payment history.

**Root Cause:**
- Webhook `invoice.payment_succeeded` handler couldn't find `user_id` from subscription metadata
- During upgrades via `/api/subscription/change-plan`, the Stripe subscription is modified in-place
- Metadata is NOT updated during subscription updates, only during initial creation
- Webhook tried to use `subscription.metadata.user_id` which was `null`
- Payment recording failed silently

**Location:** `/app/api/webhooks/stripe/route.ts` line 232-233

### Bug #2: Subscription Shows "inactive" Instead of "active"
**Symptom:** In Supabase `user_subscriptions` table, the subscription shows `subscription_status = 'inactive'` even though the subscription is active.

**Root Cause:**
- Database has TWO status columns:
  - `status` (correct, used by webhooks) - line 22 in schema
  - `subscription_status` (legacy admin column) - added later via migration
- Webhooks update `status` column
- Some admin/UI code reads `subscription_status` column
- Columns were out of sync

**Location:** Database schema inconsistency

---

## ✅ Fixes Applied

### Fix #1: Enhanced User ID Detection in Webhook

**File:** `/app/api/webhooks/stripe/route.ts`

**Changes:**
1. Added fallback logic to detect `user_id` from multiple sources:
   - First try: `subscription.metadata.user_id` (works for new subscriptions)
   - Second try: Look up by `stripe_subscription_id` in database (works for upgrades)
   - Third try: Get from Stripe customer metadata as last resort

2. Improved error logging to track missing user_id issues

3. Used database values as fallback for plan_id and billing_cycle in payment description

**Code Changes:**
```typescript
// NEW: Multi-source user_id detection
let userId = subscription.metadata?.user_id

if (!userId) {
  console.log('⚠️ No user_id in subscription metadata, looking up by stripe_subscription_id')
  const { data: existingSub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  userId = existingSub?.user_id

  if (!userId) {
    // Try customer metadata as last resort
    const customer = await stripe.customers.retrieve(subscription.customer)
    userId = customer.metadata?.supabase_user_id
  }
}
```

---

### Fix #2: Sync Subscription Status Columns

**File:** `/supabase/migrations/20251023_sync_subscription_status_columns.sql`

**Changes:**
1. One-time sync: Copy all values from `status` → `subscription_status`
2. Created trigger: Auto-sync both columns on any update
3. Added deprecation comment to `subscription_status` column
4. Validation query to check for any remaining mismatches

**Migration Steps:**
```sql
-- 1. Sync existing data
UPDATE user_subscriptions
SET subscription_status = status
WHERE subscription_status != status OR subscription_status IS NULL;

-- 2. Create sync trigger
CREATE FUNCTION sync_subscription_status() ...
CREATE TRIGGER sync_subscription_status_trigger ...

-- 3. Verify sync succeeded
```

---

## 📋 Testing Instructions

### Test the Fixes in Production

#### Prerequisite: Apply Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `/supabase/migrations/20251023_sync_subscription_status_columns.sql`
3. Paste and execute
4. Verify success message: "Success! All status columns are now in sync"

#### Test Upgrade Flow
1. **Create new test user** (or use existing trial user)
2. **Subscribe to Starter plan** (7-day trial starts)
3. **Immediately upgrade to Professional** via billing page "Change Plan"
4. **Verify in Stripe Dashboard → Webhooks:**
   - ✅ `customer.subscription.updated` webhook fired
   - ✅ `invoice.payment_succeeded` webhook fired
   - ✅ Both returned `200 OK`
5. **Verify in Supabase → `user_subscriptions` table:**
   - ✅ `status` = 'active' (not 'inactive')
   - ✅ `subscription_status` = 'active' (synced)
   - ✅ `plan_id` = 'professional'
   - ✅ `is_active` = true
6. **Verify in Supabase → `payment_history` table:**
   - ✅ Entry #1: Trial start ($0.00)
   - ✅ Entry #2: Professional upgrade payment ($19.00 or prorated amount)
   - ✅ Description includes credit if applicable
7. **Verify in App → `/dashboard/billing`:**
   - ✅ Current plan shows "Professional"
   - ✅ Status badge shows "Active"
   - ✅ Payment history displays BOTH entries
   - ✅ Upgrade payment shows correct amount

---

## 🔍 Debugging Tips

### If Payment Still Missing
Check Vercel logs for webhook processing:
```
Filter: /api/webhooks/stripe
Search for: "invoice.payment_succeeded"
```

Look for these log entries:
- ✅ `"Processing invoice.payment_succeeded"`
- ✅ `"user_id: <uuid>"` (should not be null)
- ✅ `"Payment recorded with proration details"`

### If Status Still Shows "inactive"
Run this SQL query in Supabase:
```sql
SELECT
  id,
  user_id,
  plan_id,
  status,
  subscription_status,
  is_active,
  stripe_subscription_id
FROM user_subscriptions
WHERE user_id = 'YOUR_TEST_USER_ID';
```

Both `status` and `subscription_status` should match. If not:
1. Check if migration was applied: `SELECT * FROM pg_trigger WHERE tgname = 'sync_subscription_status_trigger';`
2. Manually sync: `UPDATE user_subscriptions SET subscription_status = status WHERE id = 'YOUR_SUB_ID';`

---

## 📊 Expected Behavior After Fixes

### Upgrade Flow Timeline
1. **T+0s:** User clicks "Upgrade to Professional"
2. **T+1s:** Stripe processes subscription update
3. **T+2s:** `customer.subscription.updated` webhook → Updates database `status` and `subscription_status` to 'active'
4. **T+3s:** Trial ends immediately, payment charged
5. **T+4s:** `invoice.payment_succeeded` webhook → Records payment in `payment_history`
6. **T+5s:** User sees updated plan and payment history on billing page

### Database State After Upgrade
**user_subscriptions:**
| Column | Value |
|--------|-------|
| plan_id | 'professional' |
| status | 'active' |
| subscription_status | 'active' (synced) |
| is_active | true |
| trial_end | null (trial ended) |
| stripe_subscription_id | 'sub_xxx...' |

**payment_history:**
| Description | Amount |
|-------------|--------|
| Started 7-day free trial for Starter plan | $0.00 |
| Payment for professional plan (monthly) - Credit applied: $1.50 | $17.50 |

---

## 🚀 Deployment Checklist

- [x] Code changes committed to `/app/api/webhooks/stripe/route.ts`
- [x] Migration created: `/supabase/migrations/20251023_sync_subscription_status_columns.sql`
- [ ] **Deploy code to Vercel** (push to main branch)
- [ ] **Run migration in Supabase** (production database)
- [ ] **Test upgrade flow** with real test user
- [ ] **Monitor Stripe webhooks** for next 24 hours
- [ ] **Check Vercel logs** for any webhook errors

---

## 🔄 Rollback Plan

If issues occur after deployment:

### Rollback Code Changes
```bash
git revert HEAD
git push origin main
```

### Rollback Database Migration
```sql
-- Remove trigger
DROP TRIGGER IF EXISTS sync_subscription_status_trigger ON user_subscriptions;
DROP FUNCTION IF EXISTS sync_subscription_status();

-- Optionally remove subscription_status column entirely
-- ALTER TABLE user_subscriptions DROP COLUMN subscription_status;
```

---

## 📝 Future Improvements

1. **Metadata Sync:** Update `/api/subscription/change-plan` to also update Stripe subscription metadata during upgrades
2. **Column Deprecation:** Eventually remove `subscription_status` column entirely and migrate all code to use `status`
3. **Webhook Monitoring:** Add alerting for failed webhook processing (e.g., missing user_id)
4. **Payment Reconciliation:** Create admin tool to manually sync missing payments from Stripe

---

**Author:** Claude Code
**Tested On:** Production (www.socialcal.app)
**Status:** ✅ Ready for Deployment

# Production Stripe Integration - Testing Checklist

**Date:** _____________
**Tester:** _____________
**Production URL:** https://www.socialcal.app

---

## ⚙️ Pre-Testing Setup (5-10 minutes)

### 1. Verify Stripe Dashboard Configuration

- [ ] Log into [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] Navigate to **Developers → Webhooks**
- [ ] Confirm endpoint exists: `https://www.socialcal.app/api/webhooks/stripe`
- [ ] Verify **Status**: Enabled ✅
- [ ] Confirm events are selected:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
- [ ] Note the webhook signing secret format: `whsec_...`

**Screenshot Location:** `_________________________`

---

### 2. Verify Vercel Environment Variables

- [ ] Log into [Vercel Dashboard](https://vercel.com)
- [ ] Navigate to your project → Settings → Environment Variables
- [ ] Confirm these variables exist:
  - [ ] `STRIPE_SECRET_KEY` (starts with `sk_live_...` or `sk_test_...`)
  - [ ] `STRIPE_WEBHOOK_SECRET` (matches Stripe Dashboard webhook secret)
  - [ ] `NEXT_PUBLIC_APP_URL=https://www.socialcal.app`
  - [ ] All 6 Stripe Price IDs are set

**Notes:** _____________________________________________

---

### 3. Verify Supabase Database

- [ ] Log into [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Navigate to **SQL Editor**
- [ ] Run verification query:

```sql
-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_subscriptions', 'payment_history');

-- Verify unique constraint exists
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'payment_history'
AND constraint_type = 'UNIQUE';
```

- [ ] Both tables exist ✅
- [ ] Unique constraint on `stripe_invoice_id` exists ✅

**Database Status:** ☐ Ready  ☐ Issues Found

---

## 🧪 Phase 1: New User Subscription Flow (20 min)

### Test Account Creation

**Test Email:** `____________________________`
**Test Plan:** ☐ Starter  ☐ Professional  ☐ Enterprise
**Billing Cycle:** ☐ Monthly  ☐ Yearly

### Step-by-Step Testing

#### 1.1 Create Account
- [ ] Go to https://www.socialcal.app/signup
- [ ] Create new account with test email
- [ ] Verify email (check inbox)
- [ ] Successfully log into dashboard

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

#### 1.2 Navigate to Billing
- [ ] Go to `/dashboard/billing` or click pricing page
- [ ] Page loads without errors
- [ ] Current status shows: "No active subscription" or similar

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

#### 1.3 Initiate Checkout
- [ ] Click "Subscribe" or "Get Started" button
- [ ] Select plan: _________________
- [ ] Redirected to Stripe Checkout page
- [ ] Stripe checkout displays correct:
  - [ ] Plan name
  - [ ] Price amount
  - [ ] Trial period (7 days)

**Screenshot:** `_________________________`
**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

#### 1.4 Complete Payment
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Expiry: Any future date (e.g., `12/34`)
- [ ] CVC: Any 3 digits (e.g., `123`)
- [ ] ZIP: Any 5 digits (e.g., `12345`)
- [ ] Email: (should be pre-filled)
- [ ] Click "Subscribe" / "Start trial"

**Processing:**
- [ ] Payment processes successfully
- [ ] No error messages displayed
- [ ] Redirected back to app (not stuck on Stripe page)

**Redirect URL:** `_________________________`
**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

#### 1.5 Verify Billing Page Updates
- [ ] Automatically redirected to `/dashboard/billing`
- [ ] Page shows updated subscription info:
  - [ ] Current Plan: _________________ (correct plan name)
  - [ ] Status: "Active" or "Trialing"
  - [ ] Trial banner visible (if applicable)
  - [ ] Trial end date: _________________ (should be ~7 days from now)
  - [ ] Next billing date: _________________

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

#### 1.6 Check Payment History Section
- [ ] Payment History section visible on billing page
- [ ] Shows recent entry:
  - [ ] Description: "Started 7-day free trial..." or payment description
  - [ ] Amount: $0.00 (if trial) or actual amount
  - [ ] Date: Today's date
  - [ ] Status: "Succeeded"

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

## 🔗 Phase 2: Webhook Verification (10 min)

### 2.1 Check Stripe Dashboard Webhooks
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Click on endpoint: `https://www.socialcal.app/api/webhooks/stripe`
- [ ] Click on "Recent Events" or "Logs" tab
- [ ] Find the most recent events (within last few minutes)

**Recent Events:**

| Event Type | Status | Response Time | Notes |
|------------|--------|---------------|-------|
| `checkout.session.completed` | ☐ 200 ☐ Error | _____ms | ____________ |
| `customer.subscription.created` | ☐ 200 ☐ Error | _____ms | ____________ |
| `invoice.payment_succeeded` | ☐ 200 ☐ Error | _____ms | ____________ |

- [ ] All webhooks returned `200 OK`
- [ ] No failed deliveries (if any, note error codes)
- [ ] Response times < 500ms

**Screenshot:** `_________________________`
**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 2.2 Check Vercel Logs (Optional but recommended)
- [ ] Go to Vercel Dashboard → Project → Logs
- [ ] Filter by time: Last 15 minutes
- [ ] Search for: `/api/webhooks/stripe`
- [ ] Check for log entries:
  - [ ] `=== Stripe Webhook Received ===`
  - [ ] `✅ Webhook verified: checkout.session.completed`
  - [ ] `✅ Webhook processed successfully in XXms`
  - [ ] No error messages (`❌`)

**Errors Found:** ☐ None  ☐ See notes: _____________________
**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

## 💾 Phase 3: Database Integrity (10 min)

### 3.1 Verify user_subscriptions Table
- [ ] Go to Supabase Dashboard → Table Editor
- [ ] Open `user_subscriptions` table
- [ ] Find row for test user (filter by email or user_id)

**Data Verification:**
- [ ] Row exists
- [ ] `user_id`: _________________ (UUID format)
- [ ] `plan_id`: _________________ (starter/professional/enterprise)
- [ ] `status`: _________________ (should be 'trialing' or 'active')
- [ ] `billing_cycle`: _________________ (monthly/yearly)
- [ ] `stripe_subscription_id`: _________________ (starts with `sub_`)
- [ ] `stripe_customer_id`: _________________ (starts with `cus_`)
- [ ] `current_period_start`: _________________ (today's date)
- [ ] `current_period_end`: _________________ (future date)
- [ ] `trial_end`: _________________ (~7 days from now, if trialing)
- [ ] `is_active`: `true` ✅
- [ ] `created_at`: _________________ (recent timestamp)
- [ ] `updated_at`: _________________ (recent timestamp)

**Screenshot:** `_________________________`
**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 3.2 Verify payment_history Table
- [ ] Go to Supabase Dashboard → Table Editor
- [ ] Open `payment_history` table
- [ ] Find row(s) for test user

**Data Verification:**
- [ ] At least one row exists
- [ ] `user_id`: _________________ (matches subscription)
- [ ] `subscription_id`: _________________ (UUID linking to user_subscriptions)
- [ ] `amount`: _________________ (0 for trial, or actual amount in cents)
- [ ] `currency`: 'usd' ✅
- [ ] `status`: 'succeeded' ✅
- [ ] `stripe_invoice_id`: _________________ (unique, starts with `in_`)
- [ ] `description`: _________________ (readable description)
- [ ] `created_at`: _________________ (recent timestamp)

**Check for Duplicates:**
- [ ] Run query to check duplicates:

```sql
SELECT stripe_invoice_id, COUNT(*) as count
FROM payment_history
WHERE user_id = 'YOUR_TEST_USER_ID'
GROUP BY stripe_invoice_id
HAVING COUNT(*) > 1;
```

- [ ] No duplicates found ✅ (query returns 0 rows)

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

## 🎨 Phase 4: UI/UX Validation (10 min)

### 4.1 Billing Page Display
- [ ] Navigate to `/dashboard/billing`
- [ ] Page renders without console errors (check browser DevTools)

**Visual Checks:**
- [ ] Current plan section displays:
  - [ ] Plan name badge with correct color
  - [ ] Status badge ("Active" or "Free Trial")
  - [ ] Correct plan features listed
  - [ ] Next billing date or trial end date
  - [ ] Billing cycle (Monthly/Yearly)

- [ ] Trial banner (if trialing):
  - [ ] Blue alert box visible
  - [ ] Shows "Free Trial Active"
  - [ ] Displays trial end date
  - [ ] Shows days remaining

- [ ] Usage statistics section:
  - [ ] Posts used / limit displays correctly
  - [ ] AI suggestions used / limit displays correctly
  - [ ] Connected accounts used / limit displays correctly
  - [ ] Progress bars render properly

- [ ] Payment history section:
  - [ ] Table displays with proper formatting
  - [ ] Shows recent payment/trial entry
  - [ ] Date, description, amount, status columns visible

**Screenshot:** `_________________________`
**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 4.2 Stripe Customer Portal
- [ ] Click "Manage Billing" button
- [ ] Opens Stripe Customer Portal in new tab/window
- [ ] Portal displays:
  - [ ] Current subscription details
  - [ ] Payment method on file
  - [ ] Billing history
  - [ ] Option to update payment method
  - [ ] Option to cancel subscription

- [ ] (Optional) Update payment method to verify it works
- [ ] Portal is fully functional without errors

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 4.3 Refresh Status Button
- [ ] Click "Refresh Status" button on billing page
- [ ] Button shows loading state:
  - [ ] Text changes to "Refreshing..."
  - [ ] Spinner icon appears
  - [ ] Button is disabled during refresh

- [ ] After completion:
  - [ ] Success toast notification appears: "Billing data refreshed"
  - [ ] Button returns to normal state
  - [ ] Page data updates (if any changes)
  - [ ] No errors in console

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

## 🔒 Phase 5: Subscription Gates (10 min)

### 5.1 Access Premium Features
Test accessing features that require active subscription:

**AI Suggestions:**
- [ ] Go to Create Post page
- [ ] Click "Generate with AI" or AI suggestion button
- [ ] Feature is accessible (no subscription gate)
- [ ] AI generation works correctly

**Analytics:**
- [ ] Navigate to `/dashboard/analytics`
- [ ] Page loads without subscription gate
- [ ] Analytics data displays correctly

**Advanced Features:**
- [ ] Test any other premium features
- [ ] No "Upgrade to access" messages blocking features
- [ ] All features work as expected

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 5.2 Verify No Subscription Prompts
- [ ] Navigate through dashboard sections
- [ ] Confirm no unwanted subscription gates appear
- [ ] All sidebar menu items are accessible
- [ ] No "locked" icons on navigation items

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

## ⬆️ Phase 6: Upgrade Flow (Optional, 15 min)

**Note:** Only test this if you want to verify upgrade functionality. This will change the subscription.

### 6.1 Initiate Upgrade
- [ ] From billing page, click "Upgrade Plan" or similar
- [ ] Select higher tier plan: _________________
- [ ] Click upgrade button
- [ ] Redirected to Stripe Checkout

**Checkout Details:**
- [ ] Shows new plan name and price
- [ ] Displays proration credit (if applicable)
- [ ] Shows amount due today (should be prorated)

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 6.2 Complete Upgrade
- [ ] Complete checkout with test card `4242 4242 4242 4242`
- [ ] Payment processes successfully
- [ ] Redirected back to app

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 6.3 Verify Upgrade Webhook
- [ ] Go to Stripe Dashboard → Webhooks → Recent Events
- [ ] Find `customer.subscription.updated` event
- [ ] Status: `200 OK`
- [ ] Response time: _____ms

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 6.4 Verify Database Update
- [ ] Check `user_subscriptions` table
- [ ] `plan_id` updated to new plan: _________________
- [ ] `status` still 'active' or 'trialing'
- [ ] `updated_at` timestamp is recent

- [ ] Check `payment_history` table
- [ ] New entry exists for upgrade
- [ ] `description` mentions credit applied (if applicable)
- [ ] `metadata` contains proration details:
  - [ ] `credit_applied` amount (if applicable)
  - [ ] `subtotal` and `total` amounts
  - [ ] `starting_balance` (negative indicates credit)

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 6.5 Verify UI Update
- [ ] Billing page reflects new plan
- [ ] Plan badge shows upgraded plan name
- [ ] Features list updated to new tier
- [ ] Payment history shows upgrade transaction with credit details

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

## 📊 Phase 7: Performance & Monitoring (10 min)

### 7.1 Check Webhook Performance
- [ ] Review Stripe webhook response times (from Phase 2)
- [ ] All webhooks completed in < 500ms ✅
- [ ] Average response time: _____ms

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 7.2 Review Vercel Logs
- [ ] Go to Vercel Dashboard → Logs
- [ ] Filter to last 30 minutes
- [ ] Search for `/api/webhooks/stripe`
- [ ] Review all webhook processing logs

**Success Indicators:**
- [ ] All logs show `✅ Webhook processed successfully`
- [ ] No `❌` error messages
- [ ] Processing times logged (check they're < 500ms)
- [ ] No timeout errors

**Error Count:** _____ errors found
**Notes:** _____________________________________________

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 7.3 Check Supabase Logs (Optional)
- [ ] Go to Supabase Dashboard → Logs
- [ ] Filter to recent queries
- [ ] Look for any RLS policy violations or database errors
- [ ] Confirm all queries executed successfully

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

## 🧹 Phase 8: Cleanup & Cancellation Test (Optional, 10 min)

**Warning:** This will cancel the test subscription. Only do this if you're done testing and want to verify cancellation flow.

### 8.1 Cancel Subscription
- [ ] Go to billing page
- [ ] Click "Manage Billing" → Opens Stripe Customer Portal
- [ ] Click "Cancel subscription" or similar
- [ ] Confirm cancellation

**Cancellation:**
- [ ] Cancellation processes successfully
- [ ] Portal shows "Subscription canceled" or "Will cancel at period end"
- [ ] Return to app billing page

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 8.2 Verify Cancellation Webhook
- [ ] Go to Stripe Dashboard → Webhooks → Recent Events
- [ ] Find `customer.subscription.deleted` or `customer.subscription.updated` event
- [ ] Status: `200 OK`
- [ ] Response time: _____ms

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 8.3 Verify Database Update
- [ ] Check `user_subscriptions` table
- [ ] Row for test user updated:
  - [ ] `status`: 'canceled'
  - [ ] `is_active`: `false`
  - [ ] `canceled_at`: _________________ (recent timestamp)
  - [ ] `updated_at`: _________________ (recent timestamp)

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

### 8.4 Verify UI Update
- [ ] Refresh billing page
- [ ] Status shows "Canceled" or "No active subscription"
- [ ] Subscription features are locked again (if applicable)
- [ ] UI updates correctly without manual refresh

**Time:** ___:___ | **Status:** ☐ ✅ Pass  ☐ ❌ Fail

---

## ✅ Final Success Criteria Checklist

### Core Functionality
- [ ] User can complete signup → subscribe flow end-to-end
- [ ] Stripe checkout works without errors
- [ ] Payment processes successfully
- [ ] User redirected back to app after payment

### Webhooks
- [ ] All webhook events deliver successfully (200 responses)
- [ ] Webhook processing completes in < 500ms
- [ ] No webhook signature verification failures
- [ ] No duplicate webhook processing

### Database
- [ ] `user_subscriptions` table updates correctly
- [ ] `payment_history` table records transactions
- [ ] No duplicate payment entries (unique constraint working)
- [ ] All foreign keys and relationships intact
- [ ] RLS policies allow proper access

### UI/UX
- [ ] Billing page displays accurate subscription info
- [ ] Trial indicators appear correctly (if applicable)
- [ ] Payment history displays properly
- [ ] "Manage Billing" button opens Stripe portal
- [ ] "Refresh Status" button works correctly
- [ ] No console errors or warnings

### Features
- [ ] Subscription gates unlock after payment
- [ ] Premium features are accessible
- [ ] No incorrect "upgrade" prompts
- [ ] Usage statistics display correctly

### Performance
- [ ] Page loads are fast (< 2 seconds)
- [ ] No infinite loading states
- [ ] Webhook processing is efficient
- [ ] No race conditions or API spam

---

## 🚨 Issues Found

**Issue #1:**
**Description:** _____________________________________________
**Severity:** ☐ Critical  ☐ High  ☐ Medium  ☐ Low
**Steps to Reproduce:** _____________________________________________
**Screenshot:** `_________________________`
**Status:** ☐ Resolved  ☐ In Progress  ☐ Blocked

---

**Issue #2:**
**Description:** _____________________________________________
**Severity:** ☐ Critical  ☐ High  ☐ Medium  ☐ Low
**Steps to Reproduce:** _____________________________________________
**Screenshot:** `_________________________`
**Status:** ☐ Resolved  ☐ In Progress  ☐ Blocked

---

**Issue #3:**
**Description:** _____________________________________________
**Severity:** ☐ Critical  ☐ High  ☐ Medium  ☐ Low
**Steps to Reproduce:** _____________________________________________
**Screenshot:** `_________________________`
**Status:** ☐ Resolved  ☐ In Progress  ☐ Blocked

---

## 📝 Additional Notes

**Overall Test Result:** ☐ ✅ PASS  ☐ ⚠️ PASS WITH ISSUES  ☐ ❌ FAIL

**Total Time:** _____ minutes

**Recommendations:**
_____________________________________________
_____________________________________________
_____________________________________________

**Next Steps:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## 🔄 Rollback Plan (If Critical Issues Found)

### Immediate Actions
1. **Disable Webhook Endpoint**
   - [ ] Go to Stripe Dashboard → Webhooks
   - [ ] Click on endpoint `https://www.socialcal.app/api/webhooks/stripe`
   - [ ] Click "Disable endpoint" temporarily
   - [ ] Note time disabled: _________________

2. **Investigate Logs**
   - [ ] Check Vercel logs for error details
   - [ ] Check Supabase logs for database issues
   - [ ] Document error messages: _____________________________________________

3. **Fix & Redeploy**
   - [ ] Identify root cause
   - [ ] Apply fix in codebase
   - [ ] Deploy to Vercel
   - [ ] Verify fix in staging/preview if possible

4. **Re-enable Webhook**
   - [ ] Test webhook endpoint manually
   - [ ] Re-enable in Stripe Dashboard
   - [ ] Monitor for successful events
   - [ ] Re-run this checklist

### Database Rollback (If Needed)
```sql
-- Only use if database schema changes caused issues
ALTER TABLE payment_history
DROP CONSTRAINT IF EXISTS payment_history_stripe_invoice_id_unique;
```

### Code Rollback (If Needed)
```bash
# Revert to previous working commit
git revert HEAD
git push origin main
```

---

**Test Completed By:** _____________
**Signature:** _____________
**Date:** _____________

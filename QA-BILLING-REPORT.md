# SocialCal Billing & Subscription QA Report

**Generated:** 2025-12-09
**Scope:** Stripe integration, subscription flows, limits enforcement, trial handling

---

## 1. BILLING CODE INVENTORY

### Checkout / Plan Upgrade

| File | Purpose |
|------|---------|
| `app/api/stripe/checkout/route.ts` | Creates Stripe checkout sessions with 7-day trials |
| `app/api/subscription/change-plan/route.ts` | Handles upgrades (immediate) and downgrades (scheduled) |
| `app/api/stripe/preview-upgrade/route.ts` | Calculates proration before plan change |
| `app/api/stripe/portal/route.ts` | Creates Stripe customer portal sessions |

### Trial Handling

| File | Purpose |
|------|---------|
| `lib/subscription/plans.ts` | Defines `trial_days: 7` for all paid plans |
| `app/api/stripe/checkout/route.ts:210` | Sets `trial_period_days` in subscription_data |
| `app/api/webhooks/stripe/route.ts:272-345` | Records trial start, handles affiliate trial tracking |

### Subscription Status Sync

| File | Purpose |
|------|---------|
| `app/api/webhooks/stripe/route.ts` | Handles all Stripe webhook events (1195 lines) |
| `lib/subscription/sync.ts` | `syncStripeSubscriptionToDatabase()` - syncs Stripe → DB |
| `lib/subscription/client.ts` | Client-side subscription status fetching |
| `providers/subscription-provider.tsx` | React context with auto-refresh on window focus |

### Limits Enforcement

| File | Purpose |
|------|---------|
| `lib/subscription/plans.ts` | Defines plan limits (posts, accounts, AI, storage) |
| `lib/subscription/usage.ts` | `checkAndIncrementUsage()`, `checkUsageOnly()` |
| `lib/subscription/account-limits.ts` | `checkAccountLimits()`, `canConnectNewAccount()` |
| `lib/subscription/service.ts` | `getUsageSummary()`, `canUseFeature()` |

### Plan Limits Reference

| Plan | Posts/Month | Connected Accounts | AI Suggestions | Storage |
|------|-------------|-------------------|----------------|---------|
| Free | 1 | 1 | 0 | 50 MB |
| Starter ($9/mo) | Unlimited | 5 | 50 | 0 |
| Professional ($19/mo) | Unlimited | 15 | 150 | 250 MB |
| Enterprise ($29/mo) | Unlimited | Unlimited | 300 | 500 MB |

---

## 2. CRITICAL BILLING FLOWS & TEST CASES

### Flow 1: New User Free → Paid Subscription

**Steps to reproduce:**
1. Sign up for new account (no subscription)
2. Navigate to `/pricing`
3. Select "Starter" plan, monthly billing
4. Complete Stripe checkout (card: `4242424242424242`)
5. Return to dashboard

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Subscription created | DB: `user_subscriptions` | Row exists |
| Plan ID | DB: `user_subscriptions.plan_id` | `'starter'` |
| Status | DB: `user_subscriptions.status` | `'trialing'` |
| Trial end | DB: `user_subscriptions.trial_end` | Now + 7 days |
| Billing cycle | DB: `user_subscriptions.billing_cycle` | `'monthly'` |
| Stripe ID | DB: `user_subscriptions.stripe_subscription_id` | Populated |
| Trial record | DB: `payment_history` | "Started 7-day free trial" |
| Stripe status | Stripe Dashboard | Subscription in "trialing" |
| UI plan badge | Dashboard | Shows "Starter" |
| Features unlocked | Dashboard | AI suggestions accessible |

**Expected UI messaging:** "Your subscription is now active!" toast

---

### Flow 2: Trial → Trial Expires (Success)

**Steps to reproduce:**
1. User has active trial (status: trialing)
2. Wait for trial_end date to pass
3. Or use Stripe CLI: `stripe trigger customer.subscription.updated`

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Subscription status | Stripe Dashboard | Transitions to `active` |
| Card charged | Stripe Dashboard | First payment processed |
| DB status | `user_subscriptions.status` | `'active'` |
| Payment recorded | `payment_history` | New row with amount |
| Email sent | User inbox | Payment receipt |
| UI | Dashboard | Plan shows as active |

---

### Flow 3: Trial → Trial Expires (Card Declined)

**Steps to reproduce:**
1. User has active trial
2. Update payment method to declining card: `4000000000000002`
3. Wait for trial end

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Webhook fired | Server logs | `invoice.payment_failed` |
| DB status | `user_subscriptions.status` | `'past_due'` |
| Payment record | `payment_history` | `status = 'failed'` |
| Email sent | User inbox | Payment failed notification |
| UI warning | Dashboard | Payment issue banner |

---

### Flow 4: Upgrade (Starter → Professional)

**Steps to reproduce:**
1. User on Starter plan (active)
2. Go to `/dashboard/billing`
3. Click "Change Plan"
4. Select Professional, keep monthly
5. Confirm upgrade

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Proration charge | Stripe Dashboard | Prorated invoice created |
| Plan updated | DB: `user_subscriptions.plan_id` | `'professional'` (immediate) |
| Change logged | DB: `subscription_change_log` | `change_type = 'upgrade'` |
| Payment recorded | DB: `payment_history` | Prorated amount |
| UI updated | Dashboard | Plan badge shows "Professional" |
| Limits increased | Settings | Can connect up to 15 accounts |
| Email sent | User inbox | Upgrade confirmation |

**Expected UI messaging:** "Plan upgraded successfully. You now have immediate access to additional features."

---

### Flow 5: Downgrade (Professional → Starter)

**Steps to reproduce:**
1. User on Professional plan
2. Go to `/dashboard/billing`
3. Click "Change Plan"
4. Select Starter

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Schedule created | Stripe Dashboard | Subscription Schedule exists |
| Current plan | DB: `user_subscriptions.plan_id` | Still `'professional'` |
| Scheduled plan | DB: `user_subscriptions.scheduled_plan_id` | `'starter'` |
| Scheduled date | DB: `user_subscriptions.scheduled_change_date` | Period end date |
| Schedule ID | DB: `user_subscriptions.stripe_schedule_id` | Populated |
| UI message | Billing page | Shows scheduled change notice |
| Email sent | User inbox | Downgrade scheduled confirmation |

**At period end:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Plan changed | DB: `user_subscriptions.plan_id` | `'starter'` |
| Schedule cleared | DB: `scheduled_plan_id` | `NULL` |
| Limits reduced | Dashboard | 5 accounts max |

**Expected UI messaging:** "Downgrade scheduled successfully. You'll keep your Professional benefits until [date], then automatically switch to Starter."

---

### Flow 6: Cancel at Period End

**Steps to reproduce:**
1. User has active paid subscription
2. Go to `/dashboard/billing`
3. Click "Cancel Subscription"
4. Choose "Cancel at period end"

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Cancel flag | Stripe: `cancel_at_period_end` | `true` |
| Canceled timestamp | DB: `user_subscriptions.canceled_at` | Populated |
| UI status | Billing page | "Subscription cancelled, access until [date]" |
| Email sent | User inbox | Cancellation confirmation |

**At period end (webhook: `customer.subscription.deleted`):**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Plan | DB: `user_subscriptions.plan_id` | `'free'` |
| Status | DB: `user_subscriptions.status` | `'active'` |
| Active flag | DB: `user_subscriptions.is_active` | `true` |
| UI | Dashboard | Free tier limits, upgrade CTA |

---

### Flow 7: Cancel Immediately

**Steps to reproduce:**
1. User has active paid subscription
2. API call: `POST /api/subscription/cancel` with `{ "immediately": true }`

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Subscription | Stripe Dashboard | Cancelled immediately |
| Plan | DB: `user_subscriptions.plan_id` | `'free'` |
| Features | Dashboard | Immediately locked |

---

### Flow 8: Payment Fails (Dunning)

**Steps to reproduce:**
1. User's card expires or is declined
2. Stripe attempts renewal charge
3. Use test card `4000000000000341` (decline after attach)

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Webhook | Server logs | `invoice.payment_failed` |
| Payment record | DB: `payment_history` | `status = 'failed'` |
| Email | User inbox | Payment failed with update link |
| UI | Dashboard | Warning about payment issue |

**After multiple failures (Stripe exhausts retries):**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Webhook | Server logs | `customer.subscription.deleted` |
| Plan | DB | Downgraded to free |

---

### Flow 9: Limits Enforcement - Posts

**Steps to reproduce:**
1. User on Free plan (1 post/month limit)
2. Create and post 1 successful post
3. Try to create a 2nd post

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Error shown | UI | Toast: "You've reached your posts limit (1/1)" |
| API response | `checkAndIncrementUsage()` | `{ allowed: false }` |
| Post blocked | DB: `scheduled_posts` | Post NOT created |

---

### Flow 10: Limits Enforcement - Connected Accounts

**Steps to reproduce:**
1. User on Starter plan (5 accounts limit)
2. Connect 5 social accounts
3. Try to connect 6th account

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Limit check | `canConnectNewAccount()` | Returns `false` |
| UI blocked | Settings page | Connection prevented |

> ⚠️ **KNOWN ISSUE:** See Risky Patterns section - limits not enforced in OAuth callbacks

---

### Flow 11: Limits Enforcement - AI Suggestions

**Steps to reproduce:**
1. User on Starter plan (50 AI suggestions/month)
2. Use AI suggestion feature
3. Check usage count

**What to verify:**

| Check | Location | Expected Value |
|-------|----------|----------------|
| Usage incremented | `app/api/ai-suggestions/route.ts:202` | `checkAndIncrementUsage()` called |
| DB updated | `usage_tracking` table | Count incremented |
| UI tracker | Dashboard | Shows correct usage |

---

## 3. RISKY PATTERNS IDENTIFIED

### ✅ FIXED: Account Limits Now Enforced on Connect

**Location:** All OAuth callback routes (`app/api/auth/*/callback/route.ts`)

**Issue (RESOLVED):** OAuth callback routes now check `canConnectNewAccount()` before inserting new social accounts.

**Fixed files:**
- `app/api/auth/facebook/callback/route.ts` - Also checks if new pages would exceed limit
- `app/api/auth/linkedin/callback/route.ts`
- `app/api/auth/twitter/callback/route.ts`
- `app/api/auth/threads/callback/route.ts`
- `app/api/auth/instagram/callback/route.ts`
- `app/api/auth/tiktok/callback/route.ts`
- `app/api/auth/pinterest/callback/route.ts`
- `app/api/auth/youtube/callback/route.ts`

**Fix Applied:** Each callback now imports `canConnectNewAccount` from `@/lib/subscription/account-limits` and checks limits before inserting new accounts. Re-authentication of existing accounts (updates) are still allowed.

**Error handling:** Users who exceed their limit are redirected to `/dashboard/settings?error=account_limit_reached` with a descriptive message.

---

### 🟡 MEDIUM: Client-Side Plan Check Without Server Verification

**Location:** `components/subscription/subscription-gate.tsx:101-103`

```typescript
const isFreeUser = subscription?.planId === 'free'
const hasNoAccount = !subscription

if (hasNoAccount) {
  // Show gate
}

// Free tier and paid users both get access
return <>{children}</>
```

**Issue:** The subscription gate trusts client-side subscription data. While limits are checked at action time for posts/AI, the UI shows unlocked content that the server may reject.

**Impact:** Low - server-side checks exist, but UX could be confusing.

---

### ✅ FIXED: Post Limit Check in Schedule API

**Location:** `app/api/posts/schedule/route.ts`

**Issue (RESOLVED):** The schedule API now checks post limits before creating scheduled posts.

**Fix Applied:**
1. Added `SubscriptionService` import
2. Before insert: Checks `usage.posts_used >= usage.posts_limit` and returns 429 if exceeded
3. After successful insert: Calls `subscriptionService.incrementUsage('posts', 1, user.id)`

**Error response:**
```json
{
  "error": "You've reached your monthly post limit (1/1). Please upgrade your plan to schedule more posts.",
  "limitReached": true,
  "usage": { "posts_used": 1, "posts_limit": 1 }
}
```

---

### 🟢 LOW: Webhook Idempotency Relies on DB

**Location:** `app/api/webhooks/stripe/route.ts:63-105`

**Observation:** The webhook handler checks `webhook_events` table for duplicates. If this table has issues, duplicate events could be processed. However, Stripe's own idempotency helps mitigate this.

---

### 🟢 LOW: Trial Expiration UI Handling

**Location:** Not found

**Issue:** No explicit UI handling found for when a trial expires but payment fails. User experience during dunning period is unclear.

---

## 4. TOP 5 BILLING TESTS BEFORE LAUNCH

### Test 1: End-to-End Checkout → Feature Unlock ⭐

**Why:** Core revenue path - must work flawlessly

**Steps:**
1. Create new account
2. Go to `/pricing`
3. Complete checkout for Starter monthly (card: `4242424242424242`)
4. Verify DB has correct subscription
5. Verify dashboard shows Starter badge
6. Try AI suggestion (should work)
7. Connect 2 accounts (should work on Starter)

**Pass criteria:** All checks pass, features unlock immediately

---

### Test 2: Trial → First Payment Success ⭐

**Why:** Most critical conversion moment

**Steps:**
1. Create trial subscription via checkout
2. Use Stripe CLI: `stripe trigger customer.subscription.trial_will_end`
3. Advance test clock or wait for trial_end
4. Verify `invoice.payment_succeeded` webhook fires
5. Verify user stays on paid plan
6. Verify payment receipt email sent

**Pass criteria:** Seamless transition from trial to paid

---

### Test 3: Plan Upgrade with Proration ⭐

**Why:** Revenue upgrade path - charges must be correct

**Steps:**
1. User on Starter monthly ($9)
2. Go to Billing, upgrade to Professional ($19)
3. Verify prorated charge in Stripe (partial month)
4. Verify DB shows Professional immediately
5. Verify new limits apply (15 accounts vs 5)
6. Verify upgrade email sent with correct amount

**Pass criteria:** Correct proration, immediate feature unlock

---

### Test 4: Cancel at Period End → Downgrade to Free ⭐

**Why:** Ensures cancelled users don't retain paid features

**Steps:**
1. User on Starter plan
2. Cancel subscription (at period end)
3. Verify `cancel_at_period_end = true` in Stripe
4. Advance clock to period end (or use test clock)
5. Verify `customer.subscription.deleted` webhook fires
6. Verify DB: `plan_id = 'free'`, `is_active = true`
7. Verify UI shows free tier limits (1 post, 1 account)

**Pass criteria:** Clean downgrade, features locked after cancellation effective

---

### Test 5: Limits Enforcement ⭐

**Why:** Prevents free/low-tier users from accessing paid features

**Steps:**
1. Create free tier user
2. Try to create 2nd post → **should fail**
3. Try to use AI suggestions → **should fail**
4. Try to connect 2nd account → ⚠️ **WILL LIKELY PASS DUE TO BUG**
5. Upgrade to Starter
6. Retry all above → **should succeed up to limits**

**Pass criteria:** All limits enforced (after fixing account limits bug)

---

## 5. STRIPE TEST CARDS REFERENCE

| Card Number | Scenario |
|-------------|----------|
| `4242424242424242` | Successful payment |
| `4000000000000002` | Card declined |
| `4000000000000341` | Attaches but fails on charge |
| `4000002500003155` | Requires 3D Secure authentication |
| `4000000000009995` | Insufficient funds |

---

## 6. WEBHOOK EVENTS TO MONITOR

| Event | Purpose | Handler Location |
|-------|---------|------------------|
| `checkout.session.completed` | New subscription created | Line 109 |
| `customer.subscription.updated` | Plan changes, cancellation flags | Line 350 |
| `customer.subscription.deleted` | Subscription ended | Line 518 |
| `invoice.payment_succeeded` | Payment processed | Line 582 |
| `invoice.payment_failed` | Payment failed (dunning) | Line 1006 |

---

## 7. SUMMARY

### Critical Issues Fixed

**✅ OAuth callback routes now check `canConnectNewAccount()` before inserting social accounts.** Plan limits for connected accounts are now enforced across all 8 platforms.

### Overall Assessment

The billing system is well-architected with:
- ✅ Proper webhook handling with idempotency
- ✅ Stripe Subscription Schedules for downgrades
- ✅ Proration handling for upgrades
- ✅ Comprehensive payment history tracking
- ✅ Email notifications for key events
- ✅ Affiliate commission tracking

**Gaps identified:**
- ✅ ~~Account connection limits not enforced in OAuth callbacks~~ **FIXED**
- ✅ ~~Post limits not checked at schedule time~~ **FIXED**
- ⚠️ No clear UI for dunning/past_due state

### Recommended Priority

1. ~~**P0 (Before Launch):** Fix account limits in OAuth callbacks~~ **DONE**
2. ~~**P1 (Before Launch):** Add post limit check to schedule API~~ **DONE**
3. **P2 (Soon After):** Add dunning state UI indicators

# Testing Guide - Phase 1 + Phase 2

## Quick Start

### 1. Apply Database Migration

**Open Supabase SQL Editor:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT/sql
```

**Run this migration:**
```sql
-- Copy and paste from: supabase/migrations/20251014_fix_payment_history_duplicates.sql

-- This will:
-- 1. Remove duplicate payment records
-- 2. Add unique constraint on stripe_invoice_id
-- 3. Add performance index
```

---

## 2. Test Stripe Webhooks Locally

### Install Stripe CLI (if not already installed):
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Login
stripe login
```

### Start webhook forwarding:
```bash
# Terminal 1: Start your dev server
npm run dev

# Terminal 2: Forward webhooks to local
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

**Copy the webhook signing secret** from Terminal 2 and update `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Trigger test events:
```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test payment success
stripe trigger invoice.payment_succeeded

# Test subscription update
stripe trigger customer.subscription.updated
```

---

## 3. Test Subscription Flow End-to-End

### A. Create Test User
1. Go to `http://localhost:3001/signup`
2. Create account with test email
3. Verify email (check Supabase Auth logs)

### B. Subscribe to Plan
1. Navigate to billing page or pricing
2. Click "Subscribe" for any plan
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout

### C. Verify Webhook Processing
**Check Terminal 2** (stripe listen) - should see:
```
✅ checkout.session.completed
✅ customer.subscription.created
✅ invoice.payment_succeeded
```

**Check Terminal 1** (npm run dev) - should see:
```
=== Stripe Webhook Received ===
✅ Webhook verified: checkout.session.completed
✅ Webhook processed successfully in XXms
```

### D. Verify Database Updates
**Supabase Dashboard → Table Editor:**

1. **user_subscriptions table:**
   - ✅ New row created with user_id
   - ✅ status = 'trialing' or 'active'
   - ✅ plan_id = selected plan
   - ✅ stripe_subscription_id populated

2. **payment_history table:**
   - ✅ Payment recorded (or trial start)
   - ✅ stripe_invoice_id unique
   - ✅ amount and currency correct

### E. Verify UI Updates
1. **Billing Page** (`/dashboard/billing`):
   - ✅ Shows correct plan
   - ✅ Trial indicator appears (if trial)
   - ✅ "Refresh Status" button works
   - ✅ Payment history shows

2. **Subscription Gate**:
   - ✅ Locked features now accessible
   - ✅ No more "Upgrade" prompts

---

## 4. Test Manual Refresh

1. Go to `/dashboard/billing`
2. Click "Refresh Status" button
3. Should see:
   - ✅ Button shows "Refreshing..." with spinner
   - ✅ Button disabled while loading
   - ✅ Toast: "Billing data refreshed"
   - ✅ Page updates with latest data

---

## 5. Test Trial Flow

### If user has trial:
1. Check billing page
2. Should see blue alert box:
   ```
   Free Trial Active
   Your trial ends on Oct 21, 2025 (7 days remaining)
   ```

### When trial ends:
- Stripe automatically charges card
- Webhook updates status to 'active'
- UI updates automatically

---

## 6. Test Error Scenarios

### A. Invalid Webhook Signature
```bash
# Send request without valid signature
curl -X POST http://localhost:3001/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

**Expected:** `400 Bad Request` - "Missing signature"

### B. Duplicate Payment
Try to insert duplicate payment manually:
```sql
-- Should fail with unique constraint error
INSERT INTO payment_history (user_id, stripe_invoice_id, amount, currency, status)
VALUES ('user-id', 'in_existing_invoice', 1000, 'usd', 'succeeded');
```

**Expected:** Error - unique constraint violation

### C. No Subscription
1. Create user but don't subscribe
2. Try to access gated feature
3. Should see subscription gate with upgrade prompt

---

## 7. Performance Testing

### Check API call reduction:
**Before Phase 1:**
```
Open /dashboard/billing
→ Network tab shows:
  - getClientSubscription
  - /api/subscription/sync-user
  - /api/subscription/fix-subscription
  - /api/subscription/sync-payments
  - /api/subscription/clean-payments
Total: 5+ requests
```

**After Phase 1:**
```
Open /dashboard/billing
→ Network tab shows:
  - Single Supabase query to user_subscriptions
Total: 1 request
```

### Check webhook processing speed:
- Should complete in < 500ms
- Check logs for duration: `✅ Webhook processed successfully in XXms`

---

## 8. Common Issues & Solutions

### Issue: Webhook signature verification fails
**Solution:**
- Make sure `STRIPE_WEBHOOK_SECRET` in `.env.local` matches Stripe CLI output
- Restart dev server after changing `.env.local`

### Issue: Subscription not updating after payment
**Solution:**
- Check webhook logs in Terminal 2
- Verify webhook reached your server
- Check Supabase logs for errors
- Click "Refresh Status" button manually

### Issue: Trial not showing correctly
**Solution:**
- Verify `trial_end` field in database
- Check subscription status = 'trialing'
- Ensure proper date formatting

---

## ✅ Success Criteria

All these should be ✅:
- [ ] Database migration applied successfully
- [ ] Stripe CLI forwarding webhooks
- [ ] Can create test subscription
- [ ] Webhook updates database
- [ ] Billing page shows correct data
- [ ] Trial indicator appears
- [ ] Manual refresh works
- [ ] No duplicate payments
- [ ] Build passes without errors
- [ ] No race conditions or API spam

---

## 📊 Monitoring in Production

### Stripe Dashboard
- Go to Developers → Webhooks
- Check endpoint status: ✅ Enabled
- Monitor recent webhook events
- Check for failed deliveries

### Supabase Dashboard
- Monitor database queries
- Check for errors in logs
- Verify RLS policies working

### Application Logs
Look for these success patterns:
```
✅ Webhook verified
✅ Webhook processed successfully
✅ Subscription updated successfully
✅ Payment recorded
```

---

## 🚨 Rollback Plan

If issues occur in production:

1. **Webhook Issues:**
   ```bash
   # Temporarily disable webhook endpoint in Stripe Dashboard
   # Fix issue
   # Re-enable endpoint
   ```

2. **Database Issues:**
   ```sql
   -- Rollback migration if needed
   ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_stripe_invoice_id_unique;
   ```

3. **Code Issues:**
   ```bash
   # Git revert to previous commit
   git revert HEAD
   git push
   ```

---

**Questions?** Check logs and error messages for specific issues.

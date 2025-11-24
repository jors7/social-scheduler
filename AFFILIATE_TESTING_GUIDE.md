# Affiliate Workflow Testing Guide

Complete guide for testing the affiliate system without spending money on real subscriptions.

---

## Quick Start

### Option 1: Stripe Test Mode (Recommended for Full Flow Testing)
Use Stripe's test mode with test card numbers - **zero real money spent!**

### Option 2: Database Testing (Fastest)
Manually insert test data via SQL - instant testing without any setup.

---

## Option 1: Stripe Test Mode ✅

Your app already supports Stripe test/live mode switching through environment variables.

### Setup

**1. Configure Test Keys in `.env.local`:**
```bash
# Use Stripe TEST keys (not live)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_TEST_WEBHOOK_SECRET
```

**2. Install Stripe CLI:**
```bash
brew install stripe/stripe-cli/stripe
stripe login
```

**3. Start Webhook Forwarding:**
```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

Copy the webhook signing secret and update `STRIPE_WEBHOOK_SECRET` in `.env.local`.

**4. Start Dev Server:**
```bash
npm run dev
```

### Test Card Numbers

```
4242 4242 4242 4242  # Successful payment
4000 0000 0000 0341  # Payment requires authentication
4000 0000 0000 0002  # Card declined
```

- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

### Complete Testing Flow

1. **Create Affiliate Account**
   - Visit `/affiliate/apply`
   - Fill out application form
   - Approve manually in database (see SQL below)

2. **Test Conversion Tracking**
   - Create test user account
   - Add `?ref=TEST123` to signup URL
   - Subscribe using test card `4242 4242 4242 4242`
   - Webhook fires automatically
   - Conversion tracked, commission calculated

3. **Test Payout Request**
   - Ensure affiliate has $50+ pending balance
   - Visit `/affiliate/dashboard`
   - Request payout
   - Check admin receives email notification

4. **Verify Everything**
   ```sql
   -- Check conversions
   SELECT * FROM affiliate_conversions
   WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST123');

   -- Check pending emails
   SELECT email_to, email_type, subject, status
   FROM pending_emails
   WHERE email_type LIKE 'affiliate_%'
   ORDER BY created_at DESC;
   ```

---

## Option 2: Database Testing ✅

Fastest way to test the UI and functionality without any Stripe setup.

### Step 1: Get Your User ID

```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

Copy the `id` value - you'll need it below.

### Step 2: Create Test Affiliate

```sql
-- Create test affiliate with $75 balance (above $50 minimum)
INSERT INTO affiliates (
  user_id,
  status,
  commission_rate,
  referral_code,
  payout_method,
  paypal_email,
  total_earnings,
  pending_balance,
  paid_balance
) VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your actual user_id
  'active',
  30.00,
  'TEST123',
  'paypal',
  'test-affiliate@example.com',
  75.00,
  75.00,
  0.00
);
```

### Step 3: Create Test Conversions

```sql
-- Create multiple test conversions with different dates
INSERT INTO affiliate_conversions (
  affiliate_id,
  customer_user_id,
  subscription_id,
  commission_amount,
  status,
  payment_date,
  created_at
) VALUES
  -- Conversion 1: 5 days ago
  (
    (SELECT id FROM affiliates WHERE referral_code = 'TEST123'),
    'customer-user-1',
    NULL,
    2.70,
    'pending',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),
  -- Conversion 2: 2 days ago
  (
    (SELECT id FROM affiliates WHERE referral_code = 'TEST123'),
    'customer-user-2',
    NULL,
    2.70,
    'pending',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  -- Conversion 3: Today
  (
    (SELECT id FROM affiliates WHERE referral_code = 'TEST123'),
    'customer-user-3',
    NULL,
    2.70,
    'pending',
    NOW(),
    NOW()
  );
```

### Step 4: Create Test Clicks

```sql
-- Create test clicks to show in dashboard
INSERT INTO affiliate_clicks (
  affiliate_id,
  referrer_url,
  user_agent,
  ip_hash,
  converted
) VALUES
  (
    (SELECT id FROM affiliates WHERE referral_code = 'TEST123'),
    'https://google.com',
    'Mozilla/5.0',
    'hash123',
    true
  ),
  (
    (SELECT id FROM affiliates WHERE referral_code = 'TEST123'),
    'https://facebook.com',
    'Mozilla/5.0',
    'hash456',
    true
  ),
  (
    (SELECT id FROM affiliates WHERE referral_code = 'TEST123'),
    'https://twitter.com',
    'Mozilla/5.0',
    'hash789',
    false
  );
```

### Step 5: Create Test Payout Request

```sql
-- Create a pending payout request
INSERT INTO affiliate_payouts (
  affiliate_id,
  amount,
  payout_method,
  status,
  requested_at
) VALUES (
  (SELECT id FROM affiliates WHERE referral_code = 'TEST123'),
  50.00,
  'paypal',
  'pending',
  NOW()
);
```

### Step 6: Verify Test Data

```sql
-- Check everything was created correctly
SELECT
  'Affiliate' as type,
  referral_code as identifier,
  pending_balance::text as value
FROM affiliates
WHERE referral_code = 'TEST123'

UNION ALL

SELECT
  'Conversions' as type,
  'Count' as identifier,
  COUNT(*)::text as value
FROM affiliate_conversions
WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST123')

UNION ALL

SELECT
  'Payout Requests' as type,
  'Count' as identifier,
  COUNT(*)::text as value
FROM affiliate_payouts
WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST123')

UNION ALL

SELECT
  'Clicks' as type,
  'Count' as identifier,
  COUNT(*)::text as value
FROM affiliate_clicks
WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST123');
```

### Step 7: Test in Browser

1. Visit `/affiliate/dashboard`
2. You should see:
   - **Pending Balance**: $75.00
   - **Conversions**: 3 conversions with correct dates
   - **Clicks**: 3 clicks (2 converted, 1 not converted)
   - **Payout History**: 1 pending payout request

3. Test payout request:
   - Enter $50 in payout field
   - Click "Request Payout"
   - Should create new payout record

4. Check admin notification was queued:
   ```sql
   SELECT email_to, email_type, subject, status, template_data
   FROM pending_emails
   WHERE email_type = 'affiliate_payout_requested'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

## Testing Email Notifications

All emails are queued in the `pending_emails` table. You can test without actually sending them.

### View Queued Emails

```sql
-- See all affiliate-related emails
SELECT
  email_to,
  email_type,
  subject,
  status,
  created_at,
  template_data
FROM pending_emails
WHERE email_type LIKE 'affiliate_%'
ORDER BY created_at DESC;
```

### Email Types You Can Test

- `affiliate_application_submitted` - When affiliate applies
- `affiliate_application_approved` - When admin approves
- `affiliate_trial_started` - When referral signs up for trial
- `affiliate_commission_earned` - When referral pays
- `affiliate_payout_requested` - When affiliate requests payout (admin receives)
- `affiliate_payout_processed` - When admin processes payout (affiliate receives)
- `affiliate_conversion_cancelled` - When referral cancels

### Manually Mark Email as Sent (Skip Actual Sending)

```sql
-- Mark email as sent without actually sending it
UPDATE pending_emails
SET
  status = 'sent',
  sent_at = NOW()
WHERE id = 'EMAIL_ID_HERE';
```

---

## Testing Checklist

### Affiliate Signup ✓
- [ ] Application record created in `affiliate_applications`
- [ ] User account created in `auth.users`
- [ ] Email queued in `pending_emails`

### Affiliate Approval ✓
- [ ] Application status = 'approved'
- [ ] Affiliate record created in `affiliates`
- [ ] Unique referral code generated
- [ ] Approval email queued

### Conversion Tracking ✓
- [ ] Click recorded in `affiliate_clicks`
- [ ] Conversion created in `affiliate_conversions`
- [ ] Commission amount = payment_amount × commission_rate ÷ 100
- [ ] Affiliate `total_earnings` and `pending_balance` updated
- [ ] Commission email queued

### Payout Request ✓
- [ ] Payout record created with status = 'pending'
- [ ] Validates minimum payout ($50 by default)
- [ ] Validates sufficient balance
- [ ] Prevents duplicate pending payouts
- [ ] Admin notification email queued

### Dashboard Display ✓
- [ ] Earnings stats display correctly
- [ ] Conversions show with correct dates (not 1/1/1970)
- [ ] Payout history displays all requests
- [ ] Status badges show correct colors
- [ ] Recent clicks tracked

### Cancellation Handling ✓
- [ ] If trial cancelled: Commission deducted, conversion marked cancelled
- [ ] If paid customer cancels: Commission kept, conversion status preserved
- [ ] Cancellation notification email queued

---

## Configuration Options

### Lower Minimum Payout for Testing

Edit `.env.local`:
```bash
AFFILIATE_MIN_PAYOUT_AMOUNT=1  # Test with just $1 instead of $50
```

### Check Current Configuration

```sql
-- View affiliate settings
SELECT
  referral_code,
  commission_rate,
  total_earnings,
  pending_balance,
  paid_balance,
  payout_method,
  paypal_email,
  status
FROM affiliates
WHERE referral_code = 'TEST123';
```

---

## Cleanup Test Data

When you're done testing, remove test data:

```sql
-- Delete test payout requests
DELETE FROM affiliate_payouts
WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST123');

-- Delete test conversions
DELETE FROM affiliate_conversions
WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST123');

-- Delete test clicks
DELETE FROM affiliate_clicks
WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST123');

-- Delete test affiliate
DELETE FROM affiliates WHERE referral_code = 'TEST123';

-- Delete test emails
DELETE FROM pending_emails WHERE email_type LIKE 'affiliate_%';
```

---

## Troubleshooting

### Issue: Conversions showing wrong dates

**Solution**: Already fixed! Conversions now use `created_at` instead of `payment_date`.

### Issue: Conversion rate drops to 0% after cancellation

**Solution**: Already fixed! Paid cancellations now preserve status and count toward conversion rate.

### Issue: Admin not receiving payout notifications

**Solution**: Already fixed! Email template created and registered in queue processor.

### Issue: NULL constraint error on subscription_id

**Solution**: Already fixed! Migration allows NULL `subscription_id` for trial conversions.

---

## API Testing with curl

### Test Payout Request API

```bash
# Request payout (requires authentication cookie)
curl -X POST http://localhost:3001/api/affiliate/payout/request \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{"amount": 50}'
```

### Test Click Tracking API

```bash
# Track affiliate click
curl -X POST http://localhost:3001/api/affiliate/track-click \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "TEST123",
    "referrerUrl": "https://example.com",
    "userAgent": "Mozilla/5.0"
  }'
```

---

## Verification Scripts

### Run Schema Verification

```bash
# Check database schema is correct
npx ts-node scripts/verify-affiliate-schema.ts
```

### Verify Conversion Calculations

```sql
-- Verify commission calculations are correct
SELECT
  a.referral_code,
  a.commission_rate,
  ac.commission_amount,
  ac.status,
  -- For $9 Starter plan: 9 × 30% = 2.70
  CASE
    WHEN ac.commission_amount = 2.70 THEN '✅ Correct'
    ELSE '❌ Wrong'
  END as calculation_check
FROM affiliate_conversions ac
JOIN affiliates a ON a.id = ac.affiliate_id
WHERE a.referral_code = 'TEST123';
```

---

## Key Files Reference

- **Affiliate Service**: `/lib/affiliate/service.ts`
- **Payout API**: `/app/api/affiliate/payout/request/route.ts`
- **Apply API**: `/app/api/affiliate/apply/route.ts`
- **Dashboard**: `/app/affiliate/dashboard/page.tsx`
- **Email Queue**: `/lib/email/queue.ts`
- **Email Templates**: `/lib/email/templates/`
- **Stripe Webhook**: `/app/api/webhooks/stripe/route.ts`
- **Database Schema**: `/supabase/migrations/20250120_create_affiliate_system.sql`

---

## Summary

You have multiple safe testing options without creating real paid subscriptions:

✅ **Stripe Test Mode** - Full realistic testing with test cards ($0 spent)
✅ **Database Testing** - Instant testing with SQL inserts
✅ **Email Queue** - Test notifications without sending
✅ **API Testing** - Direct endpoint testing with curl

**Recommended Approach**: Start with Database Testing (Option 2) to quickly verify UI and calculations, then use Stripe Test Mode for complete end-to-end testing.

Happy testing! 🎉

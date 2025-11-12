# Email System - Complete Documentation

## Overview

The SocialCal email system has been completely overhauled to provide **enterprise-grade reliability** with:
- ✅ **Automatic Retry Logic** - Failed emails retry with exponential backoff
- ✅ **Idempotency** - Prevents duplicate emails from webhook retries
- ✅ **Multi-Currency Support** - Proper formatting for USD, JPY, and all Stripe currencies
- ✅ **Comprehensive Monitoring** - Database logging of all webhook events and email status
- ✅ **Failed Payment Handling** - Automatic notification when payments fail

---

## Architecture

```
┌─────────────────┐
│ Stripe Webhooks │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Webhook Handler                      │
│ - Logs to webhook_events             │
│ - Queues emails (no direct send)     │
│ - Records payment history            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ pending_emails Table (Queue)         │
│ - Stores email with retry metadata   │
│ - Status: pending → sending → sent   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Cron Job (Every 10 minutes)          │
│ /api/cron/process-email-queue        │
│ - Checks idempotency                  │
│ - Sends via Resend                    │
│ - Retries failed (3 attempts)         │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────┐      ┌─────────────────┐
│ Resend API       │──────▶│ sent_emails     │
│ (Email Delivery) │      │ (Idempotency)   │
└──────────────────┘      └─────────────────┘
```

---

## Database Tables

### 1. `pending_emails` - Email Queue
```sql
id UUID
user_id UUID
email_to TEXT
email_type TEXT  -- 'payment_receipt', 'payment_failed', etc.
subject TEXT
template_data JSONB  -- Props for email template
status TEXT  -- 'pending', 'sending', 'sent', 'failed', 'cancelled'
attempts INTEGER
max_attempts INTEGER (default: 3)
last_error TEXT
scheduled_for TIMESTAMP  -- For delayed emails (reminders)
sent_at TIMESTAMP
metadata JSONB  -- invoice_id, subscription_id, etc.
```

### 2. `sent_emails` - Idempotency Tracking
```sql
id UUID
idempotency_key TEXT (UNIQUE)  -- SHA256 hash
user_id UUID
email_to TEXT
email_type TEXT
pending_email_id UUID
resend_email_id TEXT
sent_at TIMESTAMP
expires_at TIMESTAMP (7 days)
```

### 3. `webhook_events` - Webhook Monitoring
```sql
id UUID
stripe_event_id TEXT (UNIQUE)
event_type TEXT  -- 'invoice.payment_succeeded', etc.
status TEXT  -- 'received', 'processing', 'completed', 'failed'
user_id UUID
stripe_subscription_id TEXT
processing_time_ms INTEGER
error_message TEXT
event_data JSONB  -- Full Stripe event payload
created_at TIMESTAMP
```

---

## Email Types

| Email Type | When Sent | Queued? | Unique Identifier |
|------------|-----------|---------|-------------------|
| `trial_started` | Checkout complete (trial) | No (immediate) | `user_id + 'trial'` |
| `subscription_created` | Checkout complete (paid) | No (immediate) | `user_id + 'subscription'` |
| `payment_receipt` | invoice.payment_succeeded | ✅ Yes | `invoice_id` |
| `payment_failed` | invoice.payment_failed | ✅ Yes | `invoice_id` |
| `payment_required` | Upgrade needs payment | ✅ Yes | `invoice_id` |
| `plan_upgraded` | invoice.payment_succeeded + upgrade | ✅ Yes | `subscription_id + timestamp` |
| `plan_downgraded` | Plan change API (downgrade) | ✅ Yes | `subscription_id + effective_date` |
| `subscription_cancelled` | Subscription cancelled | ✅ Yes | `subscription_id + end_date` |

---

## Sending Emails

### ❌ OLD WAY (Direct Send - DON'T USE)
```typescript
await sendPaymentReceiptEmail(
  email,
  userName,
  planName,
  amount,
  currency,
  invoiceUrl
).catch(err => console.error(err))  // Silent failure!
```

### ✅ NEW WAY (Queued - USE THIS)
```typescript
await queuePaymentReceiptEmail(
  userId,           // Required for idempotency
  email,
  userName,
  planName,
  amount,
  currency,
  invoiceId,        // Unique identifier
  invoiceUrl
)
// No .catch() needed - queue handles failures automatically
```

---

## Idempotency

### How It Works
1. Generate hash from: `user_id + email_type + unique_identifier + email`
2. Check `sent_emails` table for existing hash
3. If found → Skip sending (already sent within 7 days)
4. If not found → Record in `sent_emails` BEFORE queueing

### Example
```typescript
// These will be deduplicated (same invoice):
await queuePaymentReceiptEmail(userId, email, ..., 'inv_123')
await queuePaymentReceiptEmail(userId, email, ..., 'inv_123')  // Skipped!

// These are different (different invoices):
await queuePaymentReceiptEmail(userId, email, ..., 'inv_123')
await queuePaymentReceiptEmail(userId, email, ..., 'inv_456')  // Sent
```

---

## Retry Logic

### Exponential Backoff
- **Attempt 1**: Immediate
- **Attempt 2**: 2 minutes later
- **Attempt 3**: 8 minutes later
- **Attempt 4**: 32 minutes later (final)

### Failure Handling
```typescript
{
  attempts: 3,
  max_attempts: 3,
  status: 'failed',
  last_error: 'Network timeout'
}
```

Failed emails remain in database for debugging. Check with:
```sql
SELECT * FROM pending_emails WHERE status = 'failed';
```

---

## Currency Formatting

### ✅ Correct (Multi-Currency)
```typescript
import { formatCurrencyForEmail } from '@/lib/utils/currency';

const { formatted } = formatCurrencyForEmail(1000, 'usd');
// Result: '$10.00'

const { formatted } = formatCurrencyForEmail(1000, 'jpy');
// Result: '¥1,000'
```

### ❌ Incorrect (Hardcoded)
```typescript
const formattedAmount = (amount / 100).toFixed(2);  // Breaks for JPY!
```

---

## Cron Job Setup

### Option 1: Vercel Cron (Recommended for Vercel hosting)
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/process-email-queue",
    "schedule": "*/10 * * * *"
  }]
}
```

### Option 2: External Cron Service (cron-job.org, etc.)
```bash
# Every 10 minutes
POST https://www.socialcal.app/api/cron/process-email-queue
Header: Authorization: Bearer YOUR_CRON_SECRET
```

### Environment Variable
```bash
CRON_SECRET=your_secure_random_string_here
```

---

## Monitoring & Debugging

### Check Webhook Status
```sql
SELECT
  event_type,
  status,
  processing_time_ms,
  error_message,
  created_at
FROM webhook_events
ORDER BY created_at DESC
LIMIT 20;
```

### Check Pending Emails
```sql
SELECT
  email_type,
  email_to,
  status,
  attempts,
  last_error,
  created_at
FROM pending_emails
WHERE status IN ('pending', 'failed')
ORDER BY created_at DESC;
```

### Check Failed Emails (Last 24 Hours)
```sql
SELECT * FROM get_failed_email_stats(24);
```

### Manual Email Retry
```typescript
import { processEmailQueue } from '@/lib/email/queue';

// Manually trigger queue processing
const stats = await processEmailQueue();
console.log(stats);  // { sent: 5, failed: 1, skipped: 0 }
```

---

## Webhook Events Handled

| Event | Handler | Email Sent |
|-------|---------|-----------|
| `checkout.session.completed` | Creates subscription | Trial/Subscription email (immediate) |
| `invoice.payment_succeeded` | Records payment | Payment receipt (queued) |
| `invoice.payment_failed` | Records failure | Payment failed (queued) |
| `customer.subscription.updated` | Syncs changes | Cancellation email (if cancelled) |
| `customer.subscription.deleted` | Downgrades to free | Cancellation email (queued) |

---

## Webhook Testing

### Local Testing with Stripe CLI
```bash
# 1. Install Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Login
stripe login

# 3. Forward webhooks to local server
stripe listen --forward-to http://localhost:3001/api/webhooks/stripe

# 4. Copy webhook secret and update .env.local
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# 5. Trigger test events
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

---

## Migration Instructions

### Step 1: Run Database Migration
```sql
-- Run this in Supabase SQL Editor
psql -f supabase/migrations/20250111_create_email_queue_tables.sql
```

### Step 2: Deploy Code
```bash
git add .
git commit -m "Add email queue system with retry and idempotency"
git push
```

### Step 3: Set Up Cron Job
- **Vercel**: Add to `vercel.json` (see above)
- **Other**: Configure external cron service

### Step 4: Set Environment Variable
```bash
# Add to .env.local and Vercel
CRON_SECRET=generate_random_string_here
```

### Step 5: Test
```bash
# Trigger cron manually
curl -X POST http://localhost:3001/api/cron/process-email-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check webhook logs
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 5;

# Check email queue
SELECT * FROM pending_emails ORDER BY created_at DESC LIMIT 5;
```

---

## Troubleshooting

### Emails Not Sending
1. Check `pending_emails` table: `SELECT * FROM pending_emails WHERE status = 'failed';`
2. Check error messages: `last_error` column
3. Verify Resend API key: `RESEND_API_KEY` in env
4. Check cron job is running: webhook_events table should show recent activity

### Duplicate Emails
1. Check `sent_emails` table for idempotency
2. Verify `uniqueIdentifier` is actually unique (use invoice_id, not timestamp)
3. Check `expired_at` - emails older than 7 days can be resent

### Webhook Failures
1. Check `webhook_events` table for error messages
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check Stripe dashboard for webhook delivery status
4. Use Stripe CLI to replay failed webhooks

### Currency Formatting Issues
1. Verify currency code is lowercase: `'usd'` not `'USD'`
2. Check `formatCurrencyForEmail()` is imported correctly
3. For JPY: amount should NOT be divided by 100

---

## Best Practices

### ✅ DO
- Always use `queueEmail()` functions in webhooks
- Provide unique identifiers (invoice_id, subscription_id)
- Log errors but don't throw (emails shouldn't break webhooks)
- Use currency formatter for ALL amount displays
- Test with Stripe CLI before deploying

### ❌ DON'T
- Don't use direct `sendEmail()` in webhooks (no retry)
- Don't hardcode currency symbols (`$`)
- Don't divide by 100 for zero-decimal currencies
- Don't batch mark todos as complete (mark immediately)
- Don't send emails without idempotency checks

---

## Performance

- **Webhook Response Time**: <500ms (email queued, not sent)
- **Email Delivery**: 2-10 minutes (cron interval + Resend)
- **Retry Delays**: 2min → 8min → 32min
- **Database Impact**: Minimal (indexed queries only)
- **Idempotency Cleanup**: Auto-expires after 7 days

---

## Support

For issues or questions:
1. Check this README
2. Review database tables (`pending_emails`, `webhook_events`)
3. Check Supabase logs
4. Review Stripe webhook dashboard
5. Test with Stripe CLI

---

**Last Updated**: January 11, 2025
**Version**: 2.0.0

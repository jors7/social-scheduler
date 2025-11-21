# Custom Affiliate Program - Complete Implementation Plan

## Overview
Building a complete in-house affiliate system for SocialCal with:
- **30% recurring commissions** (lifetime)
- **Manual approval** for all affiliate applications
- **PayPal automated payouts** via PayPal Payouts API
- **Separate user types** - Affiliates don't have access to member features
- **SocialOrbit-style signup form** - Exact replica from AFFILIATE_SIGNUP_PORTABLE.md
- **Member→Affiliate conversion** - Existing members can apply (with approval)

---

## Phase 1: Environment Setup

### PayPal Configuration Added to `.env.local`
```env
# PayPal Payouts Configuration
PAYPAL_CLIENT_ID=AdEQzvebd_t9phGpMvNJAju9t5LOPKUBOd7X6uJYHl2WEvCM1ELK82Oh5jrHCnARu23fZ4cm2OcdnbfV
PAYPAL_CLIENT_SECRET=EPmgGHFhMbYi9dEm6BL-XOzHHSEDBCdVwmB-OoYjAuR-hj-SEN0NMke0Ve8bp-ObhzEGQVWiJLTtkDQG
PAYPAL_MODE=live

# Affiliate Program Settings
AFFILIATE_DEFAULT_COMMISSION_RATE=30
AFFILIATE_COOKIE_DURATION_DAYS=30
AFFILIATE_MIN_PAYOUT_AMOUNT=50
AFFILIATE_PROGRAM_ENABLED=true
```

---

## Phase 2: Database Schema

### 6 New Tables with RLS Policies

**1. `affiliates` Table**
```sql
- id (UUID, PK)
- user_id (FK to auth.users)
- status (pending|active|suspended)
- commission_rate (default 30)
- total_earnings (decimal)
- pending_balance (decimal)
- paid_balance (decimal)
- referral_code (unique slug)
- payout_method (paypal|bank_transfer)
- paypal_email
- created_at, updated_at
```

**2. `affiliate_applications` Table**
```sql
- id (UUID, PK)
- user_id (FK to auth.users)
- first_name, last_name, email
- company, website
- application_reason (100-500 chars)
- audience_size, primary_platform
- promotional_methods (JSONB array)
- social_media_profiles (JSONB array)
- affiliate_experience
- status (pending|approved|rejected)
- reviewed_by (FK to auth.users, nullable)
- reviewed_at (timestamp)
- rejection_reason (text, nullable)
- created_at
```

**3. `affiliate_links` Table**
```sql
- id (UUID, PK)
- affiliate_id (FK to affiliates)
- slug (unique tracking code)
- name (optional label)
- utm_params (JSONB)
- clicks_count (integer)
- conversions_count (integer)
- created_at
```

**4. `affiliate_clicks` Table**
```sql
- id (UUID, PK)
- affiliate_id (FK to affiliates)
- link_id (FK to affiliate_links, nullable)
- referrer_url (text)
- user_agent (text)
- ip_hash (text - anonymized for GDPR)
- converted (boolean, default false)
- created_at
```

**5. `affiliate_conversions` Table**
```sql
- id (UUID, PK)
- affiliate_id (FK to affiliates)
- customer_user_id (FK to auth.users)
- subscription_id (FK to user_subscriptions)
- click_id (FK to affiliate_clicks, nullable)
- commission_amount (decimal)
- status (pending|approved|paid|refunded)
- payment_date (timestamp)
- stripe_invoice_id (text)
- created_at
```

**6. `affiliate_payouts` Table**
```sql
- id (UUID, PK)
- affiliate_id (FK to affiliates)
- amount (decimal)
- payout_method (paypal|bank_transfer)
- status (pending|processing|completed|failed)
- paypal_batch_id (text, nullable)
- paypal_payout_item_id (text, nullable)
- paypal_transaction_id (text, nullable)
- failure_reason (text, nullable)
- requested_at (timestamp)
- processed_at (timestamp, nullable)
- created_at
```

---

## Phase 3: User Type System

### Auth Metadata Schema
Update `auth.users.user_metadata`:
```typescript
{
  user_type: 'member' | 'affiliate' | 'both',
  full_name?: string,
  avatar_url?: string
}
```

### Middleware Routing Logic
- `/dashboard/*` → Requires `user_type: 'member' | 'both'`
- `/affiliate/dashboard/*` → Requires `user_type: 'affiliate' | 'both'`
- `/affiliate/login` → Separate login page for affiliates
- `/affiliate/signup` → Public affiliate application form

**User Flow:**
1. Affiliate signs up → `user_type: 'affiliate'`, `status: 'pending'`
2. Admin approves → `status: 'active'`, welcome email sent
3. Affiliate logs in → Redirected to `/affiliate/dashboard`

**Member→Affiliate Flow:**
1. Member clicks "Become Affiliate" in dashboard
2. Fills out questionnaire (already authenticated)
3. `user_type` updated to `'both'` after approval
4. Member now sees affiliate section in dashboard

---

## Phase 4: Affiliate Signup Form

### Create `/app/affiliate/signup/page.tsx`
- **Exact replica** of SocialOrbit form from AFFILIATE_SIGNUP_PORTABLE.md
- Replace "Social Orbit" with "SocialCal" (3 locations)
- API endpoint: `/api/affiliate/apply`
- On submit: Creates Supabase auth account + application record
- Redirect to login with success message

### Form Fields (from AFFILIATE_SIGNUP_PORTABLE.md):
1. **Personal Info:** First Name, Last Name, Email, Password, Confirm Password
2. **Business Info:** Company (optional), Website (optional)
3. **Payout:** PayPal Email (required)
4. **Audience:** Audience Size (dropdown), Primary Platform (dropdown)
5. **Social Profiles:** Up to 3 profiles (platform, URL, followers)
6. **Strategy:** Promotional methods (multi-checkbox), Affiliate experience (dropdown)
7. **Application:** Why promote SocialCal (100-500 chars textarea)

### Validation Rules:
- Password: 8+ chars, uppercase, lowercase, number
- Application reason: 100-500 characters
- At least 1 promotional method selected
- At least 1 social media profile with all fields filled

---

## Phase 5: Authentication System

### New Pages:
**`/affiliate/login/page.tsx`**
- Separate login for affiliates (or unified with redirect)
- After login, check `user_type` from metadata
- Redirect appropriately based on type

**Login Logic:**
```typescript
const { user } = await supabase.auth.getUser()
const userType = user.user_metadata.user_type

if (userType === 'member') redirect('/dashboard')
if (userType === 'affiliate') redirect('/affiliate/dashboard')
if (userType === 'both') redirect('/dashboard') // Member dashboard shows affiliate section
```

---

## Phase 6: Admin Approval System

### Admin Page: `/app/admin/affiliates/page.tsx`

**4 Main Sections:**

1. **Pending Applications Tab**
   - List all applications with `status: 'pending'`
   - Show applicant info, questionnaire responses, social profiles
   - Actions: Approve button, Reject button (with reason modal)
   - On approve: Update affiliate status, send welcome email
   - On reject: Update status, send rejection email

2. **Active Affiliates Tab**
   - List all active affiliates with stats
   - Columns: Name, Referral Code, Total Earnings, Conversions, Status
   - Actions: View details, Suspend, Adjust commission rate

3. **Payout Queue Tab**
   - List all pending payout requests
   - Show affiliate name, amount, PayPal email, requested date
   - Bulk actions: "Process Selected via PayPal"
   - Manual processing: Mark as completed for bank transfers

4. **Analytics Dashboard Tab**
   - Total affiliates count
   - Total commissions paid
   - Average conversion rate
   - Top performing affiliates
   - Monthly revenue from affiliate program

---

## Phase 7: Affiliate Dashboard

### Page: `/app/affiliate/dashboard/page.tsx`

**5 Main Sections:**

1. **Overview Stats Cards**
   - Total Lifetime Earnings
   - Pending Balance (available for withdrawal)
   - Paid Out Amount
   - Total Conversions
   - Click-Through Rate
   - Active Customers

2. **Quick Actions**
   - "Request Payout" button (enabled when balance ≥ $50)
   - "Generate New Link" button
   - "View Analytics" button

3. **Referral Links**
   - Primary link: `socialcal.app?ref=YOURCODE`
   - Link generator with UTM builder
   - QR code generator
   - Copy button for each link
   - Stats per link (clicks, conversions)

4. **Recent Conversions Table**
   - Columns: Date, Customer (anonymized), Plan, Commission, Status
   - Filter by date range, status
   - Pagination

5. **Payout History Table**
   - Columns: Date, Amount, Method, Transaction ID, Status
   - Download invoices/receipts

---

## Phase 8: PayPal Payouts Integration

### New Service: `/lib/paypal/service.ts`

**Functions:**
- `getAccessToken()` - OAuth 2.0 authentication
- `createPayout(payouts)` - Batch payout creation
- `getPayoutStatus(batchId)` - Check payout status
- `handleWebhook(event)` - Process PayPal webhooks

**Payout Flow:**
1. Affiliate clicks "Request Payout" (balance ≥ $50)
2. Record created in `affiliate_payouts` with `status: 'pending'`
3. Admin goes to payout queue, selects payouts
4. Admin clicks "Process via PayPal"
5. Backend calls PayPal Payouts API with batch
6. PayPal sends funds (typically 24-48 hours)
7. Webhook updates payout status to `'completed'`
8. Email sent to affiliate with transaction ID

**PayPal API Endpoints:**
- `POST /v1/oauth2/token` - Get access token
- `POST /v1/payments/payouts` - Create payout batch
- `GET /v1/payments/payouts/{batch_id}` - Get payout status

**Error Handling:**
- Invalid PayPal email → Mark as failed, notify admin
- Insufficient funds → Retry later
- Rate limiting → Queue and retry

---

## Phase 9: Referral Tracking System

### Cookie Tracking (Middleware Update)

**`/middleware.ts` Enhancement:**
```typescript
// Capture ?ref=CODE parameter
const refParam = request.nextUrl.searchParams.get('ref')
if (refParam) {
  response.cookies.set('socialcal_referral', refParam, {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
    sameSite: 'lax'
  })
}
```

### Click Tracking API: `/app/api/affiliate/track/route.ts`
- Called on page load if referral cookie exists
- Logs click with IP hash, user agent, referrer URL
- Links click to affiliate and specific tracking link

### Checkout Integration
**`/app/api/stripe/checkout/route.ts` Update:**
- Read `socialcal_referral` cookie
- Look up affiliate by referral code
- Add `affiliate_id` to Stripe checkout metadata
- Pass through to subscription metadata

---

## Phase 10: Commission Calculation (Recurring)

### Stripe Webhook Handler Update

**`/app/api/webhooks/stripe/route.ts` Enhancement:**

On `invoice.payment_succeeded` event:
```typescript
1. Extract affiliate_id from subscription metadata
2. If affiliate_id exists:
   - Calculate commission: payment_amount * commission_rate (30%)
   - Create record in affiliate_conversions
   - Update affiliate.total_earnings and affiliate.pending_balance
   - Send "commission earned" email to affiliate
   - Link conversion to original click (if tracked)
```

On `invoice.payment_refunded` event:
```typescript
1. Find original conversion record
2. Deduct commission from pending_balance
3. Mark conversion as 'refunded'
4. Notify affiliate if significant impact
```

**Commission Lifecycle:**
- `pending` → Commission earned, not yet paid out
- `approved` → Ready for payout (currently same as pending)
- `paid` → Included in processed payout
- `refunded` → Customer refunded, commission reversed

---

## Phase 11: Email Notifications

### New Email Templates (8 total)

Using existing Resend integration + email queue system:

1. **Application Submitted** → Admin
   - Subject: "New Affiliate Application from [Name]"
   - CTA: "Review Application"

2. **Application Approved** → Affiliate
   - Subject: "Welcome to SocialCal Affiliate Program!"
   - Include: Referral code, login link, getting started guide

3. **Application Rejected** → Affiliate
   - Subject: "Affiliate Application Update"
   - Include: Reason (optional), reapplication timeline

4. **First Commission Earned** → Affiliate
   - Subject: "🎉 Your First Commission!"
   - Include: Amount, customer plan, milestone celebration

5. **Commission Earned** → Affiliate (batch weekly)
   - Subject: "You Earned $X This Week"
   - Include: Breakdown by customer, total pending balance

6. **Payout Requested** → Admin
   - Subject: "Payout Request from [Name] - $X"
   - CTA: "Process Payout"

7. **Payout Processed** → Affiliate
   - Subject: "Payout Sent - $X on the way!"
   - Include: Amount, PayPal transaction ID, expected arrival

8. **Monthly Summary** → Affiliate
   - Subject: "Your [Month] Affiliate Performance"
   - Include: Total earnings, conversions, top links, growth trends

---

## Phase 12: Remove Endorsely

### Cleanup Steps:
1. Remove Endorsely script from `/app/page.tsx` (homepage)
2. Update `/app/affiliate/page.tsx` to redirect to `/affiliate/signup`
3. Keep `/app/affiliate/terms/page.tsx` (already well-written, just update branding)
4. Remove `endorsely_referral` logic from checkout flow
5. Remove environment variable: `ENDORSELY_ID` (if exists)

**Migration Plan:**
- If existing Endorsely affiliates exist, provide migration path
- Export affiliate data from Endorsely dashboard
- Import into new system with manual approval

---

## Files to Create (Total: ~25 new files)

### Database (1 file)
- `/supabase/migrations/20250120_create_affiliate_system.sql` (all 6 tables + RLS)

### API Routes (10 files)
- `/app/api/affiliate/apply/route.ts` - Submit application
- `/app/api/affiliate/stats/route.ts` - Dashboard stats
- `/app/api/affiliate/links/route.ts` - CRUD tracking links
- `/app/api/affiliate/conversions/route.ts` - Get conversion history
- `/app/api/affiliate/payout/request/route.ts` - Request payout
- `/app/api/affiliate/profile/route.ts` - Update profile/payout settings
- `/app/api/affiliate/track/route.ts` - Click tracking
- `/app/api/admin/affiliates/approve/route.ts` - Approve/reject applications
- `/app/api/admin/affiliates/payouts/route.ts` - Process payouts
- `/app/api/paypal/webhook/route.ts` - PayPal webhook handler

### Pages (5 files)
- `/app/affiliate/login/page.tsx` - Affiliate login
- `/app/affiliate/signup/page.tsx` - Application form (from AFFILIATE_SIGNUP_PORTABLE.md)
- `/app/affiliate/dashboard/page.tsx` - Affiliate dashboard
- `/app/admin/affiliates/page.tsx` - Admin management
- `/app/dashboard/become-affiliate/page.tsx` - Member application

### Components (9 files)
- `/components/affiliate/stats-overview.tsx` - Dashboard stats cards
- `/components/affiliate/link-generator.tsx` - Referral link creator
- `/components/affiliate/conversion-table.tsx` - Conversions list
- `/components/affiliate/payout-request-form.tsx` - Request payout modal
- `/components/affiliate/payout-history.tsx` - Payout history table
- `/components/admin/affiliate-applications.tsx` - Pending applications
- `/components/admin/affiliate-list.tsx` - Active affiliates list
- `/components/admin/payout-queue.tsx` - Payout processing
- `/components/admin/affiliate-analytics.tsx` - Program analytics

### Services (3 files)
- `/lib/affiliate/service.ts` - Core affiliate business logic
- `/lib/affiliate/tracking.ts` - Cookie and click tracking utilities
- `/lib/paypal/service.ts` - PayPal Payouts API client

### Types (1 file)
- `/types/affiliate.ts` - TypeScript interfaces for all affiliate data

---

## Files to Modify (Total: 5 files)

1. **`.env.local`** - Add PayPal credentials and affiliate settings
2. **`/middleware.ts`** - Add referral cookie capture logic
3. **`/app/api/webhooks/stripe/route.ts`** - Add commission calculation
4. **`/app/api/stripe/checkout/route.ts`** - Pass affiliate_id to Stripe
5. **`/components/dashboard/sidebar.tsx`** - Add "Become Affiliate" link for members

---

## Implementation Timeline

**Estimated: 3-4 weeks full implementation**

- **Week 1:** Database schema, auth system, signup form, PayPal service
- **Week 2:** Admin approval system, affiliate dashboard, tracking system
- **Week 3:** Commission calculation, webhook integration, email templates
- **Week 4:** Testing, bug fixes, Endorsely removal, documentation

---

## Success Criteria

- ✅ Affiliates can sign up with SocialOrbit-style form
- ✅ Admin can review and approve/reject applications
- ✅ Approved affiliates receive unique referral codes
- ✅ Click tracking works via cookie (30-day attribution)
- ✅ Commissions calculated automatically on recurring payments (30%)
- ✅ Affiliates can view stats and conversions in dashboard
- ✅ Affiliates can request payouts (≥$50 minimum)
- ✅ Admin can process PayPal payouts in batches
- ✅ Email notifications sent at all key steps
- ✅ Members can apply to become affiliates
- ✅ Refunds properly deduct commissions
- ✅ PayPal webhooks update payout status

---

## Implementation Progress Tracking

### Phase 1: Environment Setup ✅
- [x] Add PayPal credentials to .env.local
- [x] Add affiliate program settings to .env.local

### Phase 2: Database Schema
- [ ] Create migration file with all 6 tables
- [ ] Add RLS policies
- [ ] Run migration in Supabase

### Phase 3: User Type System
- [ ] Update auth flow to support user_type metadata
- [ ] Update middleware for routing logic

### Phase 4: Affiliate Signup Form
- [ ] Create signup page component
- [ ] Implement validation
- [ ] Create API endpoint

### Phase 5: Authentication System
- [ ] Create affiliate login page
- [ ] Implement redirect logic based on user type

### Phase 6: Admin Approval System
- [ ] Create admin affiliates page
- [ ] Implement approval/rejection flow
- [ ] Create admin API endpoints

### Phase 7: Affiliate Dashboard
- [ ] Create dashboard layout
- [ ] Implement stats overview
- [ ] Create conversion table
- [ ] Implement payout request

### Phase 8: PayPal Integration
- [ ] Create PayPal service
- [ ] Implement payout API calls
- [ ] Create webhook handler

### Phase 9: Tracking System
- [ ] Update middleware for cookie tracking
- [ ] Create click tracking API
- [ ] Update checkout integration

### Phase 10: Commission Calculation
- [ ] Update Stripe webhook handler
- [ ] Implement commission calculation logic
- [ ] Add refund handling

### Phase 11: Email Notifications
- [ ] Create email templates
- [ ] Implement email sending logic

### Phase 12: Remove Endorsely
- [ ] Remove Endorsely script
- [ ] Update affiliate landing page
- [ ] Clean up old code

---

## Notes

- PayPal credentials are in LIVE mode
- Commission rate: 30% recurring (lifetime)
- Cookie duration: 30 days
- Minimum payout: $50
- User types: 'member', 'affiliate', 'both'
- Approval flow: Manual approval by admin required

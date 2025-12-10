# Pre-Launch Infrastructure Checklist for SocialCal

**Generated:** December 10, 2025
**Last Updated:** December 10, 2025
**Status:** Pre-production audit

---

## 🚨 CRITICAL ISSUES - STATUS

### 1. Stripe Test Keys
**Status:** ✅ FIXED
Live keys configured in Vercel production environment. Test keys in `.env.local` for local development only.

### 2. Client-Side CRON_SECRET Exposure
**Status:** ✅ FIXED
Removed client-side cron trigger in `app/dashboard/posts/scheduled/page.tsx`. Now shows info message instead.

### 3. Debug Logging in Production
**Status:** ✅ FIXED
Removed sensitive logging from:
- `app/api/auth/linkedin/route.ts`
- `app/api/auth/facebook/route.ts`
- `lib/instagram/service.ts`
- `app/api/auth/instagram/callback/route.ts`

---

## 📋 External Dependencies & Required Environment Variables

### Core Infrastructure

| Service | Environment Variables | Production Dashboard |
|---------|----------------------|---------------------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`<br>`NEXT_PUBLIC_SUPABASE_ANON_KEY`<br>`SUPABASE_SERVICE_ROLE_KEY` | [supabase.com/dashboard](https://supabase.com/dashboard) |
| **Stripe** | `STRIPE_SECRET_KEY` (sk_live_)<br>`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_live_)<br>`STRIPE_WEBHOOK_SECRET`<br>`STRIPE_STARTER_MONTHLY_PRICE_ID`<br>`STRIPE_STARTER_YEARLY_PRICE_ID`<br>`STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID`<br>`STRIPE_PROFESSIONAL_YEARLY_PRICE_ID`<br>`STRIPE_ENTERPRISE_MONTHLY_PRICE_ID`<br>`STRIPE_ENTERPRISE_YEARLY_PRICE_ID` | [dashboard.stripe.com](https://dashboard.stripe.com) |
| **Cloudflare R2** | `R2_ACCOUNT_ID`<br>`R2_ACCESS_KEY_ID`<br>`R2_SECRET_ACCESS_KEY`<br>`R2_BUCKET_NAME`<br>`R2_PUBLIC_URL` | [dash.cloudflare.com](https://dash.cloudflare.com) |
| **OpenAI** | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) |

### Background Jobs & Email

| Service | Environment Variables | Production Dashboard |
|---------|----------------------|---------------------|
| **Upstash QStash** | `QSTASH_TOKEN`<br>`QSTASH_URL`<br>`QSTASH_CURRENT_SIGNING_KEY`<br>`QSTASH_NEXT_SIGNING_KEY` | [console.upstash.com](https://console.upstash.com) |
| **Resend** | `RESEND_API_KEY`<br>`RESEND_AUDIENCE_ID`<br>`EMAIL_FROM`<br>`EMAIL_REPLY_TO` | [resend.com/emails](https://resend.com/emails) |

### Payments

| Service | Environment Variables | Production Dashboard |
|---------|----------------------|---------------------|
| **PayPal** | `PAYPAL_CLIENT_ID`<br>`PAYPAL_CLIENT_SECRET`<br>`PAYPAL_MODE=live` | [developer.paypal.com](https://developer.paypal.com) |

### Social Media APIs

| Platform | Environment Variables | Production Dashboard |
|----------|----------------------|---------------------|
| **Meta (Facebook)** | `FACEBOOK_APP_ID`<br>`FACEBOOK_APP_SECRET` | [developers.facebook.com](https://developers.facebook.com) |
| **Meta (Instagram)** | `INSTAGRAM_CLIENT_ID`<br>`INSTAGRAM_CLIENT_SECRET` | [developers.facebook.com](https://developers.facebook.com) |
| **Meta (Threads)** | `THREADS_APP_ID`<br>`THREADS_APP_SECRET` | [developers.facebook.com](https://developers.facebook.com) |
| **Google/YouTube** | `YOUTUBE_CLIENT_ID`<br>`YOUTUBE_CLIENT_SECRET` | [console.cloud.google.com](https://console.cloud.google.com) |
| **TikTok** | `TIKTOK_CLIENT_KEY`<br>`TIKTOK_CLIENT_SECRET`<br>`TIKTOK_SANDBOX=false`<br>`TIKTOK_UNAUDITED=false` | [developers.tiktok.com](https://developers.tiktok.com) |
| **LinkedIn** | `LINKEDIN_CLIENT_ID`<br>`LINKEDIN_CLIENT_SECRET` | [developer.linkedin.com](https://developer.linkedin.com) |
| **Pinterest** | `PINTEREST_APP_ID`<br>`PINTEREST_APP_SECRET` | [developers.pinterest.com](https://developers.pinterest.com) |
| **Twitter/X** | `TWITTER_API_KEY`<br>`TWITTER_API_SECRET`<br>`TWITTER_ACCESS_TOKEN`<br>`TWITTER_ACCESS_TOKEN_SECRET` | [developer.twitter.com](https://developer.twitter.com) |

### Application Configuration

| Variable | Production Value |
|----------|-----------------|
| `NEXT_PUBLIC_APP_URL` | `https://www.socialcal.app` |
| `CRON_SECRET` | Strong random string (32+ chars) |
| `AFFILIATE_DEFAULT_COMMISSION_RATE` | `30` |
| `AFFILIATE_COOKIE_DURATION_DAYS` | `30` |
| `AFFILIATE_MIN_PAYOUT_AMOUNT` | `50` |
| `AFFILIATE_PROGRAM_ENABLED` | `true` |

---

## ✅ Pre-Launch Verification Checklist

### QStash/Cron Jobs
**Status:** ✅ CONFIGURED

Current schedules verified:
- [x] `process-scheduled-posts` - Every minute (`* * * * *`)
- [x] `snapshot-analytics` - Daily at midnight (`0 0 * * *`)

Note: Schedules use `socialcal.app` (no www). Works fine with Vercel domain handling.

---

## 🔐 Stripe Webhook Verification

### How to Verify in Stripe Dashboard

1. **Go to Stripe Dashboard**
   - URL: [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   - **IMPORTANT:** Toggle to **Live mode** (top-right corner)

2. **Check Endpoint Exists**
   - Look for: `https://www.socialcal.app/api/webhooks/stripe`
   - If missing, click "Add endpoint" and configure

3. **Verify Events Selected**
   Required events:
   - [x] `checkout.session.completed`
   - [x] `customer.subscription.created`
   - [x] `customer.subscription.updated`
   - [x] `customer.subscription.deleted`
   - [x] `invoice.payment_succeeded`
   - [x] `invoice.payment_failed`

4. **Check Webhook Health**
   - Click on the endpoint
   - Go to "Recent deliveries" tab
   - Recent events should show ✅ green checkmarks
   - If showing ❌ failures, check error messages

5. **Verify Signing Secret**
   - Click "Reveal" on the signing secret
   - Confirm it matches `STRIPE_WEBHOOK_SECRET` in Vercel env vars

### Testing Stripe Webhook

**Option 1: Stripe Dashboard**
```
Webhooks → Your Endpoint → "Send test webhook" → Select event → Send
```

**Option 2: Stripe CLI**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Trigger a test event to production
stripe trigger checkout.session.completed --live

# Or listen and forward (for debugging)
stripe listen --forward-to https://www.socialcal.app/api/webhooks/stripe
```

**Option 3: Check Recent Activity**
- Make a real test purchase (can refund immediately)
- Check Stripe Dashboard → Webhooks → Recent deliveries
- Should see `checkout.session.completed` with 200 response

---

## 🔗 OAuth Redirect Verification

### How to Verify Each Platform

#### Facebook / Instagram / Threads (Meta)

1. **Go to:** [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. **Select your app** (SocialCal Publisher or similar)
3. **For Facebook:**
   - Left sidebar → Facebook Login → Settings
   - Find "Valid OAuth Redirect URIs"
   - Verify contains: `https://www.socialcal.app/api/auth/facebook/callback`
4. **For Instagram:**
   - Left sidebar → Instagram Basic Display → Basic Display
   - Find "Valid OAuth Redirect URIs"
   - Verify contains: `https://www.socialcal.app/api/auth/instagram/callback`
5. **For Threads:**
   - May be under Instagram settings or separate Threads API
   - Verify contains: `https://www.socialcal.app/api/auth/threads/callback`
6. **Check App Mode:**
   - Top of page should show "Live" not "Development"

#### YouTube / Google

1. **Go to:** [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. **Select your project**
3. **Click on your OAuth 2.0 Client ID**
4. **Check "Authorized redirect URIs":**
   - Verify contains: `https://www.socialcal.app/api/auth/youtube/callback`
5. **Check OAuth Consent Screen:**
   - APIs & Services → OAuth consent screen
   - Publishing status should be "In production" (not "Testing")

#### TikTok

1. **Go to:** [developers.tiktok.com](https://developers.tiktok.com)
2. **My Apps → Select your app**
3. **Configuration tab**
4. **Check "Redirect URI":**
   - Verify contains: `https://www.socialcal.app/api/auth/tiktok/callback`
5. **Check App Status:**
   - Should show "Live" or "Approved"
   - If "Sandbox", set `TIKTOK_SANDBOX=false` won't work

#### LinkedIn

1. **Go to:** [developer.linkedin.com/apps](https://developer.linkedin.com/apps)
2. **Select your app**
3. **Auth tab**
4. **Check "Authorized redirect URLs for your app":**
   - Verify contains: `https://www.socialcal.app/api/auth/linkedin/callback`
5. **Check Products tab:**
   - Ensure required products are approved (Sign In with LinkedIn, Share on LinkedIn)

#### Pinterest

1. **Go to:** [developers.pinterest.com/apps](https://developers.pinterest.com/apps)
2. **Select your app**
3. **Check "Redirect URIs":**
   - Verify contains: `https://www.socialcal.app/api/auth/pinterest/callback`
4. **Check App Status:**
   - Should be approved for production access

### Quick Functional Test

The fastest way to verify OAuth is working end-to-end:

1. Go to `https://www.socialcal.app/dashboard/settings`
2. Try connecting each social platform:
   - [ ] Facebook - Click Connect → Completes OAuth → Returns to settings
   - [ ] Instagram - Click Connect → Completes OAuth → Returns to settings
   - [ ] Threads - Click Connect → Completes OAuth → Returns to settings
   - [ ] YouTube - Click Connect → Completes OAuth → Returns to settings
   - [ ] TikTok - Click Connect → Completes OAuth → Returns to settings
   - [ ] LinkedIn - Click Connect → Completes OAuth → Returns to settings
   - [ ] Pinterest - Click Connect → Completes OAuth → Returns to settings
   - [ ] Bluesky - Enter credentials → Connects successfully

**Common OAuth Errors:**

| Error | Likely Cause |
|-------|--------------|
| "redirect_uri_mismatch" | Redirect URL not registered in platform's developer console |
| "invalid_client" | Wrong client ID/secret or app not approved |
| "access_denied" | User cancelled or app permissions not granted |
| Redirect to wrong URL | `NEXT_PUBLIC_APP_URL` not set correctly |

---

## 🔒 Security Verification

### Health Checks

```bash
# Basic app availability
curl -I https://www.socialcal.app
# Expected: HTTP/2 200

# Auth redirect (should redirect to login)
curl -I https://www.socialcal.app/dashboard
# Expected: HTTP/2 307 (redirect to /?signin=true or /pricing)

# API endpoint (should require auth)
curl https://www.socialcal.app/api/posts/schedule
# Expected: 401 Unauthorized

# Cron without auth (should reject)
curl https://www.socialcal.app/api/cron/process-scheduled-posts
# Expected: 401 Unauthorized

# Cron with auth (should work)
curl -s "https://www.socialcal.app/api/cron/process-scheduled-posts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
# Expected: 200 with JSON response
```

---

## 🔍 Security Measures Already In Place

| Feature | Status | Location |
|---------|--------|----------|
| Stripe webhook signature verification | ✅ | `app/api/webhooks/stripe/route.ts` |
| QStash signature verification | ✅ | `app/api/cron/process-scheduled-posts/route.ts` |
| Bearer token auth on cron endpoints | ✅ | All `/api/cron/*` routes |
| Stripe key validation (throws on prod+test) | ✅ | `lib/stripe/validation.ts` |
| `.gitignore` excludes `.env*.local` | ✅ | `.gitignore` |
| Service role key server-side only | ✅ | Never in `NEXT_PUBLIC_*` |
| Media proxy restricted to own project | ✅ | `app/api/media/proxy/route.ts` |
| RLS enabled on database tables | ✅ | Supabase policies |
| Admin routes require admin_users check | ✅ | Middleware + `requireAdmin()` |

---

## 📝 Final Launch Sequence

### Completed
- [x] Replace test/sandbox keys in Vercel production
- [x] Fix client-side CRON_SECRET reference
- [x] Remove debug logging from auth routes
- [x] Set up QStash schedules

### Pre-Launch Checks
- [ ] Verify Stripe webhook in dashboard (see section above)
- [ ] Verify OAuth redirects for all platforms (see section above)
- [ ] Run `npm run build` to catch any issues
- [ ] Check Vercel Functions logs for startup errors

### Launch Day
- [ ] Monitor Stripe webhook deliveries (first hour)
- [ ] Monitor QStash job completions
- [ ] Watch Vercel logs for first 30 minutes
- [ ] Test a real subscription flow (can refund)

### Post-Launch
- [ ] Verify scheduled posts are processing
- [ ] Check email deliveries in Resend dashboard
- [ ] Review error logs in Supabase

---

## 🆘 Rollback Plan

If critical issues are discovered post-launch:

1. **Stripe issues**: Enable test mode temporarily (users can't pay but app works)
2. **Database issues**: Supabase point-in-time recovery available
3. **Cron issues**: Disable QStash schedules, posts won't auto-publish but won't be lost
4. **Social API issues**: Individual platforms can be disabled in UI without affecting others

---

## 📊 Post-Launch Monitoring

### Daily Checks (First Week)
- [ ] Stripe dashboard: Payment success rate
- [ ] Supabase: Database size and query performance
- [ ] Vercel: Function invocations and errors
- [ ] QStash: Job success rate
- [ ] Resend: Email delivery rate

### Key Metrics to Watch
- Webhook delivery success rate (Stripe) - should be >99%
- Cron job completion rate (QStash) - should be 100%
- API response times (Vercel) - should be <2s average
- Social post success rate - varies by platform

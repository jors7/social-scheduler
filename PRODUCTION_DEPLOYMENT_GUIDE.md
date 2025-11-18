# Production Deployment Guide - Stripe Integration

## Overview
This guide will help you deploy SocialCal to production with Stripe integration fully configured. Follow these steps carefully to ensure a smooth deployment.

---

## Prerequisites Checklist

Before deploying, ensure you have:

- [x] **Stripe Account** in Live Mode
- [x] **6 Production Price Objects** created in Stripe
- [x] **Production Webhook Endpoint** configured
- [ ] **Stripe Customer Portal** enabled
- [x] **Vercel Account** with project deployed
- [x] **Production API Keys** from Stripe

---

## Step 1: Enable Stripe Customer Portal (5 minutes)

The Customer Portal allows users to manage their subscriptions, update payment methods, and view billing history.

1. Go to [Stripe Dashboard → Settings → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Click **"Activate test link"** to enable the portal
3. Configure portal features:
   - ✅ **Allow customers to update payment methods**
   - ✅ **Allow customers to update subscriptions** (upgrade/downgrade)
   - ✅ **Allow customers to cancel subscriptions**
   - ✅ **Show payment history**
4. Click **"Save changes"**

---

## Step 2: Configure Vercel Environment Variables (10 minutes)

Go to your Vercel project dashboard and navigate to **Settings → Environment Variables**.

### Required Environment Variables

Add the following environment variables for **Production** environment:

#### Stripe Configuration

```bash
# Stripe API Keys (LIVE MODE)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY

# Stripe Webhook Secret (Production Webhook)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Stripe Price IDs - STARTER
STRIPE_STARTER_MONTHLY_PRICE_ID=price_YOUR_STARTER_MONTHLY_PRICE_ID
STRIPE_STARTER_YEARLY_PRICE_ID=price_YOUR_STARTER_YEARLY_PRICE_ID

# Stripe Price IDs - PROFESSIONAL
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_YOUR_PROFESSIONAL_MONTHLY_PRICE_ID
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_YOUR_PROFESSIONAL_YEARLY_PRICE_ID

# Stripe Price IDs - ENTERPRISE
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_YOUR_ENTERPRISE_MONTHLY_PRICE_ID
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_YOUR_ENTERPRISE_YEARLY_PRICE_ID
```

#### Application Configuration

```bash
# Production URL
NEXT_PUBLIC_APP_URL=https://www.socialcal.app
```

### Important Notes

- **Environment**: Select **"Production"** when adding these variables
- **Price IDs**: These are already set as fallbacks in code, but environment variables override them
- **Webhook Secret**: Make sure this matches your production webhook endpoint in Stripe
- **API Keys**: Must be LIVE mode keys (start with `sk_live_` and `pk_live_`)

---

## Step 3: Verify Webhook Configuration (2 minutes)

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Verify your production webhook endpoint:
   - **URL**: `https://www.socialcal.app/api/webhooks/stripe`
   - **Events to listen for**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `customer.subscription.trial_will_end`
3. Copy the **Signing Secret** and verify it matches `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Step 4: Deploy to Production (5 minutes)

### Option A: Automatic Deployment (Recommended)

If you have automatic deployments enabled in Vercel:

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Configure Stripe for production deployment"
   git push origin main
   ```

2. Vercel will automatically deploy your changes
3. Wait for deployment to complete (usually 2-3 minutes)
4. Check deployment logs for any errors

### Option B: Manual Deployment

If automatic deployments are disabled:

1. Go to Vercel Dashboard → Your Project
2. Click **"Deployments"** tab
3. Click **"Deploy"** button
4. Select **"Production"** branch
5. Wait for deployment to complete

---

## Step 5: Post-Deployment Verification (10 minutes)

After deployment, run through this checklist to verify everything is working:

### 5.1 Check Stripe Key Validation

1. Open your production site: `https://www.socialcal.app`
2. Open browser console (F12)
3. Navigate to any page
4. **Expected**: No Stripe key validation errors in console
5. **If errors**: Check that you're using LIVE mode keys, not test keys

### 5.2 Test Checkout Flow

1. Sign up for a new account (use a real email you can access)
2. Click **"Subscribe"** button for any plan
3. **Expected**: Redirected to Stripe Checkout
4. **Verify**:
   - Checkout page shows correct plan and pricing
   - Trial period is displayed (7 days)
   - No errors in browser console

**⚠️ IMPORTANT**: Use Stripe test cards for testing:
- Test card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

5. Complete the checkout process
6. **Expected**: Redirected back to dashboard with active subscription

### 5.3 Verify Database Sync

1. After successful checkout, check your Supabase database
2. Navigate to **"user_subscriptions"** table
3. **Expected**:
   - New row created for your user
   - `status` = 'trialing' or 'active'
   - `plan_id` matches selected plan
   - `stripe_customer_id` and `stripe_subscription_id` populated

### 5.4 Test Webhook Delivery

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your production webhook endpoint
3. Click **"Attempts"** tab
4. **Expected**:
   - Recent webhook events delivered successfully
   - `checkout.session.completed` event status: **Succeeded**
   - Response code: **200**
5. **If failed**: Check Vercel function logs for errors

### 5.5 Test Customer Portal

1. Log in to your production account (the test account you created)
2. Navigate to **Settings → Billing**
3. Click **"Manage Subscription"** button
4. **Expected**: Redirected to Stripe Customer Portal
5. **Verify**:
   - Current subscription shows correct plan
   - Can update payment method
   - Can cancel subscription (don't actually cancel)

### 5.6 Test Plan Upgrade/Downgrade

1. From Billing page, click **"Upgrade"** to a higher tier
2. **Expected**:
   - Upgrade applies immediately
   - Dashboard reflects new plan limits
   - Webhook `customer.subscription.updated` fires
3. Try downgrading to a lower tier
4. **Expected**:
   - Downgrade scheduled for end of billing period
   - Current plan remains active until then
   - UI shows "Scheduled downgrade" message

---

## Step 6: Monitor Production (Ongoing)

### Set Up Monitoring

1. **Stripe Dashboard**:
   - Monitor webhook delivery success rate
   - Watch for failed payments
   - Check subscription churn metrics

2. **Vercel Logs**:
   - Set up log alerts for Stripe-related errors
   - Monitor `/api/webhooks/stripe` function logs

3. **Supabase**:
   - Monitor database for subscription sync issues
   - Check for orphaned customer records

### Common Issues to Watch For

| Issue | Symptom | Solution |
|-------|---------|----------|
| Webhook failures | Subscriptions not syncing to database | Check webhook signing secret |
| Test key in production | Payments failing silently | Verify environment variables |
| Missing price IDs | Checkout fails with 500 error | Check price ID environment variables |
| Portal not working | 404 error on customer portal | Enable portal in Stripe settings |

---

## Rollback Plan

If you encounter critical issues in production:

### Immediate Rollback

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click **"⋯"** menu → **"Promote to Production"**
4. Confirm rollback

### Switch to Test Mode (Emergency Only)

If you need to temporarily disable live payments:

1. Go to Vercel → Environment Variables
2. Replace LIVE keys with TEST keys:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
3. Redeploy
4. **⚠️ WARNING**: This will prevent real payments but allow testing

---

## Security Best Practices

### Protect Your Stripe Keys

- ✅ Never commit Stripe keys to git
- ✅ Use environment variables for all keys
- ✅ Rotate webhook secrets periodically
- ✅ Enable Stripe's radar for fraud detection
- ✅ Set up 2FA on Stripe account

### Monitor for Suspicious Activity

- Set up Stripe email alerts for:
  - Failed payments over certain amount
  - Unusual subscription volume
  - Webhook endpoint changes

---

## Troubleshooting

### Issue: Checkout redirects to wrong URL

**Cause**: `NEXT_PUBLIC_APP_URL` not set correctly

**Solution**:
1. Verify in Vercel: `NEXT_PUBLIC_APP_URL=https://www.socialcal.app`
2. Redeploy application

### Issue: Webhooks failing with 401 Unauthorized

**Cause**: Webhook signing secret mismatch

**Solution**:
1. Get new signing secret from Stripe webhook settings
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel
3. Redeploy

### Issue: "Invalid API Key" error

**Cause**: Test key used in production or key mismatch

**Solution**:
1. Verify keys start with `sk_live_` and `pk_live_`
2. Check both keys are from same Stripe account
3. Ensure no extra spaces in environment variables

### Issue: Database not updating after payment

**Cause**: Webhook not configured or failing

**Solution**:
1. Check webhook endpoint is active in Stripe
2. Verify webhook URL is correct
3. Check Vercel function logs for errors
4. Test webhook using Stripe CLI:
   ```bash
   stripe trigger checkout.session.completed
   ```

---

## Success Criteria

Your production deployment is successful when:

- ✅ New users can sign up and subscribe
- ✅ Payments are processed correctly
- ✅ Webhooks deliver with 100% success rate
- ✅ Database syncs subscription data properly
- ✅ Customer portal allows subscription management
- ✅ Upgrades/downgrades work as expected
- ✅ Trial periods are applied correctly
- ✅ No console errors related to Stripe
- ✅ All environment variables validated on startup

---

## Support & Resources

### Stripe Documentation
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

### Project Documentation
- [CLAUDE.md](/CLAUDE.md) - Project overview and architecture
- [PRODUCTION_STRIPE_TEST_CHECKLIST.md](/PRODUCTION_STRIPE_TEST_CHECKLIST.md) - Detailed test cases

### Getting Help

If you encounter issues:
1. Check Vercel function logs
2. Check Stripe webhook event logs
3. Check browser console for errors
4. Review this guide's troubleshooting section

---

## Next Steps

After successful production deployment:

1. **Marketing Setup**:
   - Enable Stripe affiliate program
   - Set up subscription analytics
   - Configure dunning emails for failed payments

2. **Feature Enhancements**:
   - Add usage tracking dashboard
   - Implement subscription upgrade prompts
   - Add annual billing discount promotions

3. **Business Operations**:
   - Set up automatic tax collection
   - Configure invoice templates
   - Enable customer email notifications

---

## Deployment History

Record your deployments here for reference:

| Date | Version | Changes | Deployed By | Status |
|------|---------|---------|-------------|--------|
| YYYY-MM-DD | v1.0 | Initial production deployment | Your Name | ✅ Success |

---

**Last Updated**: 2025-01-18
**Document Version**: 1.0
**Maintainer**: Development Team

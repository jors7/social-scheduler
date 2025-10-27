# Resend Email Setup Guide

This guide will help you set up professional email delivery for SocialCal using Resend.

## 📧 What's Been Implemented

We've replaced Supabase's default email system with **Resend** - a modern, professional email API. All transactional emails now use beautiful, branded React Email templates.

### Email Types Configured

#### Authentication Emails
- ✅ **Welcome Email** - Sent when a new user signs up
- ✅ **Magic Link** - Passwordless login links
- ✅ **Password Reset** - Secure password reset links

#### Subscription & Billing Emails
- ✅ **Trial Started** - Welcome message when 7-day trial begins
- ✅ **Subscription Created** - Confirmation when subscription activates
- ✅ **Payment Receipt** - Sent after successful payment
- ✅ **Plan Upgraded** - Confirmation with proration details
- ✅ **Plan Downgraded** - Notification of plan change
- ✅ **Subscription Cancelled** - Farewell message with reactivation option
- ✅ **Payment Failed** - Alert to update payment method

## 🚀 Setup Steps

### Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (40,000 emails/month free)
3. Verify your email address

### Step 2: Get Your API Key

1. In Resend dashboard, click "API Keys"
2. Click "Create API Key"
3. Name it "SocialCal Production"
4. Copy the API key (starts with `re_`)

### Step 3: Update Environment Variables

Update your `.env.local` file:

```bash
# Resend Email Configuration
RESEND_API_KEY=re_YOUR_ACTUAL_API_KEY_HERE
EMAIL_FROM=SocialCal <noreply@socialcal.app>
EMAIL_REPLY_TO=support@socialcal.app
```

### Step 4: Verify Your Domain

#### For Production (socialcal.app)

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter `socialcal.app`
4. Add the DNS records Resend provides to your domain registrar:

```
TXT record: _resend.socialcal.app
MX record: (if you want to receive replies)
SPF record: v=spf1 include:_spf.resend.com ~all
DKIM record: (provided by Resend)
```

5. Click "Verify Domain" once DNS records are added
6. Wait for verification (can take up to 48 hours, usually much faster)

#### For Development

For testing, you can:
- Use your verified personal email in the `EMAIL_FROM` field
- Or use Resend's sandbox mode (sends to your own email only)

### Step 5: Test Email Sending

#### Test via Stripe Checkout

1. Start your development server: `npm run dev`
2. Go to your pricing page
3. Start a checkout session
4. Complete payment (use Stripe test card: `4242 4242 4242 4242`)
5. Check your email inbox for the welcome and trial started emails

#### Manual Test (Optional)

Create a test API route:

```typescript
// app/api/test/send-email/route.ts
import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email/send';

export async function GET() {
  const result = await sendWelcomeEmail('your@email.com', 'Test User');

  return NextResponse.json(result);
}
```

Visit: `http://localhost:3001/api/test/send-email`

## 📊 Monitor Email Delivery

### Resend Dashboard

1. Go to "Emails" in Resend dashboard
2. See real-time delivery status
3. View open rates and click rates
4. Check bounces and complaints

### Troubleshooting

**Emails not sending?**
- Check RESEND_API_KEY is correct
- Verify domain is verified in Resend
- Check Resend dashboard for error messages
- Look at server logs for error details

**Emails going to spam?**
- Verify SPF and DKIM records are set up
- Warm up your domain (start with low volume)
- Use a dedicated domain/subdomain for transactional emails
- Add DMARC record for better deliverability

## 🎨 Customizing Email Templates

All email templates are in `/lib/email/templates/`.

### Edit Template Content

```typescript
// lib/email/templates/welcome.tsx
<Heading style={h1}>Welcome to SocialCal, {userName}! 👋</Heading>

<Text style={text}>
  Your custom welcome message here...
</Text>
```

### Edit Branding

Update header and footer:
- `/lib/email/templates/components/email-header.tsx` - Logo and branding
- `/lib/email/templates/components/email-footer.tsx` - Footer links

### Edit Colors/Styling

All styles are inline CSS objects in each template file.

## 📝 Email Sending Reference

### Send Custom Emails

```typescript
import { sendEmail } from '@/lib/email/send';
import MyCustomEmail from '@/lib/email/templates/my-custom-email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Your Subject Here',
  react: <MyCustomEmail name="User Name" />,
});
```

### Available Pre-built Functions

```typescript
import {
  sendWelcomeEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendTrialStartedEmail,
  sendSubscriptionCreatedEmail,
  sendPaymentReceiptEmail,
  sendPlanUpgradedEmail,
  sendPlanDowngradedEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
} from '@/lib/email/send';
```

## 🔐 Security Best Practices

1. **Never commit API keys** - Already added to `.gitignore`
2. **Use environment variables** - API key loaded from `.env.local`
3. **Validate recipients** - All functions validate email addresses
4. **Rate limiting** - Resend has built-in rate limits
5. **Unsubscribe links** - Add to marketing emails (not transactional)

## 💰 Pricing

### Resend Free Tier
- 3,000 emails/month
- All features included
- No credit card required

### Resend Paid Plans
- $20/month - 50,000 emails
- $80/month - 100,000 emails
- Custom pricing for higher volumes

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email/docs)
- [Email Best Practices](https://resend.com/docs/best-practices)
- [Deliverability Guide](https://resend.com/docs/deliverability)

## ✅ Checklist

- [ ] Created Resend account
- [ ] Got API key
- [ ] Updated `.env.local` with RESEND_API_KEY
- [ ] Added domain to Resend
- [ ] Configured DNS records (SPF, DKIM)
- [ ] Verified domain in Resend
- [ ] Tested email sending
- [ ] Checked email delivery in inbox
- [ ] Reviewed email templates
- [ ] Customized branding (optional)

## 🆘 Support

If you need help:
1. Check Resend documentation
2. Review server logs for errors
3. Contact Resend support (very responsive)
4. Check GitHub issues for common problems

---

**Your emails are now professional and branded! 🎉**

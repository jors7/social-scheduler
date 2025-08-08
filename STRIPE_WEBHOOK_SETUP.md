# Stripe Webhook Setup for Local Development

## Prerequisites
- Stripe CLI installed (you already have it at `/Users/honzik/bin/stripe`)
- Your app running locally on port 3001

## Step 1: Start the Stripe CLI webhook listener

Open a **new terminal** and run:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

This will output something like:
```
Ready! Your webhook signing secret is whsec_1234567890abcdef... (^C to quit)
```

## Step 2: Update your .env.local file

Copy the webhook signing secret (starts with `whsec_`) and update your `.env.local`:

```env
# Keep your production webhook secret separate
STRIPE_WEBHOOK_SECRET=whsec_... # Production (from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET_LOCAL=whsec_... # Local (from stripe listen command)
```

## Step 3: Restart your Next.js dev server

After updating the `.env.local`, restart your dev server:
```bash
npm run dev
```

## Step 4: Test the webhook

### Option A: Test with a real purchase
1. Go to your pricing page
2. Click "Start Free Trial" or purchase a plan
3. Complete the Stripe checkout
4. Check the terminal with `stripe listen` - you should see events logged
5. Check your app - subscription should be active

### Option B: Trigger a test event
In another terminal, run:
```bash
# Test checkout completion
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.user_id=YOUR_SUPABASE_USER_ID \
  --add checkout_session:metadata.plan_id=starter \
  --add checkout_session:metadata.billing_cycle=monthly
```

Replace `YOUR_SUPABASE_USER_ID` with your actual user ID from Supabase.

## Step 5: Verify the subscription

1. Go to http://localhost:3001/dashboard/billing
2. Your subscription should show as active
3. All lock overlays should be removed

## Troubleshooting

### If webhook events aren't being received:
1. Make sure `stripe listen` is running in a separate terminal
2. Check that the port matches (3001)
3. Verify the webhook secret is correctly set in `.env.local`

### If subscription isn't updating:
1. Check the `stripe listen` terminal for error messages
2. Check your Next.js console for webhook handler errors
3. Verify the user_id in metadata matches your Supabase user

### To find your Supabase user ID:
Run this SQL in Supabase:
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

## Production Setup

For production (Vercel), you need a different webhook:

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. Copy the signing secret
5. Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

## Important Notes

- **Local webhook secret** (`STRIPE_WEBHOOK_SECRET_LOCAL`) is temporary and changes each time you run `stripe listen`
- **Production webhook secret** (`STRIPE_WEBHOOK_SECRET`) is permanent and comes from Stripe Dashboard
- The webhook handler tries both secrets, so it works in both environments
- Always test locally before deploying to production
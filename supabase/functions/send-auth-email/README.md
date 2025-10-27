# Send Auth Email Edge Function

This Supabase Edge Function intercepts authentication emails (magic links, password resets, email confirmations) and sends them via Resend with custom branded templates.

## Prerequisites

1. Supabase CLI installed: `brew install supabase/tap/supabase`
2. Resend API key from https://resend.com/api-keys
3. Verified domain in Resend (socialcal.app)

## Setup

### 1. Login to Supabase CLI

```bash
supabase login
```

### 2. Link to your Supabase project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in Supabase Dashboard ’ Project Settings ’ General ’ Reference ID

### 3. Set Environment Variables

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Generate and set webhook secret (use a strong random string)
supabase secrets set AUTH_WEBHOOK_SECRET=$(openssl rand -base64 32)

# Set your Supabase URL
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
```

**Important**: Save the `AUTH_WEBHOOK_SECRET` value - you'll need it for configuring the auth hook in the Supabase dashboard.

### 4. Deploy the Function

```bash
supabase functions deploy send-auth-email --no-verify-jwt
```

The `--no-verify-jwt` flag is required because this function is called by Supabase's auth system, not by authenticated users.

### 5. Get the Function URL

After deployment, you'll see the function URL in the output. It will be:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-auth-email
```

## Configure Supabase Auth Hook

1. Go to Supabase Dashboard ’ Authentication ’ Hooks
2. Enable "Send Email Hook"
3. Set the webhook URL to your deployed function URL
4. Paste the `AUTH_WEBHOOK_SECRET` value you generated earlier
5. Click "Save"

## Test the Integration

### Test Password Reset

1. Go to your app's forgot password page
2. Enter an email address
3. Check that email inbox for the custom-branded password reset email
4. Click the "Reset Password" button and verify it works

### Test Email Confirmation

1. Create a new user account
2. Check the email inbox for the custom-branded confirmation email
3. Click "Confirm Email Address" and verify it works

### Test Magic Link (if used)

1. Use `supabase.auth.signInWithOtp({ email: 'test@example.com' })`
2. Check email for custom-branded magic link
3. Verify sign-in works

## Monitoring

View logs in Supabase Dashboard:
- Go to Edge Functions ’ send-auth-email
- Click "Logs" tab
- Check for any errors

View sent emails in Resend Dashboard:
- Go to https://resend.com/emails
- Verify emails are being sent successfully
- Check delivery status

## Troubleshooting

### "Invalid signature" error
- Verify AUTH_WEBHOOK_SECRET matches between Edge Function and Supabase Auth Hook settings
- Check that the secret was set correctly: `supabase secrets list`

### Emails not sending
- Verify RESEND_API_KEY is correct
- Check that "no-reply@socialcal.app" is verified in Resend
- View Resend logs for delivery issues

### Links not working
- Verify SUPABASE_URL is set correctly
- Check redirect_to parameters in your application code

## Rollback

If you need to disable custom emails:

1. Go to Supabase Dashboard ’ Authentication ’ Hooks
2. Disable "Send Email Hook"
3. Supabase will fall back to default email sending

## Update Deployment

To update the function after making changes:

```bash
supabase functions deploy send-auth-email --no-verify-jwt
```

Changes take effect immediately after deployment.

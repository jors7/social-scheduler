import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@2.0.0'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vomglwxzhuyfkraertrm.supabase.co'

// Get webhook secret and prepare for Standard Webhooks library
const rawWebhookSecret = Deno.env.get('AUTH_WEBHOOK_SECRET') || ''
// Standard Webhooks library expects the secret without "v1,whsec_" prefix
const webhookSecret = rawWebhookSecret.startsWith('v1,whsec_')
  ? rawWebhookSecret.substring(9) // Remove "v1,whsec_" prefix
  : rawWebhookSecret

const wh = new Webhook(webhookSecret)

// Import email templates (these will be bundled with the Edge Function)
// Note: You'll need to copy the template files into the function directory or use a build step
const MAGIC_LINK_TEMPLATE = (magicLink: string, otpCode?: string) => ({
  subject: 'Sign in to SocialCal',
  html: `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-top: 4px solid #6366f1; padding-top: 20px;">
          <h1 style="color: #1a1a1a; font-size: 32px; font-weight: 700; margin: 0 0 24px;">Sign In to SocialCal</h1>

          <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 0 0 16px;">
            Click the button below to securely sign in to your account:
          </p>

          <a href="${magicLink}" style="background-color: #6366f1; border-radius: 8px; color: #fff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; display: block; padding: 16px 32px; margin: 32px 0;">
            Sign In to SocialCal
          </a>

          ${otpCode ? `
          <div style="background-color: #f9fafb; padding: 24px; border-left: 4px solid #6366f1; text-align: center; margin: 32px 0; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 14px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Or use this code:</p>
            <p style="color: #1a1a1a; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 12px 0; font-family: monospace;">${otpCode}</p>
            <p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0;">This code will expire in 60 minutes</p>
          </div>
          ` : ''}

          <p style="color: #9ca3af; fontSize: 14px; line-height: 22px; margin: 24px 0 0;">
            If you didn't request this email, you can safely ignore it.
          </p>

          <div style="background-color: #fef3c7; padding: 16px; border-left: 4px solid #f59e0b; margin: 24px 0; border-radius: 8px;">
            <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0;">
              = <strong>Security tip:</strong> Never share this link or code with anyone. SocialCal will never ask for your password via email.
            </p>
          </div>

          <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 32px 0 0;">
            Best regards,<br />
            The SocialCal Team
          </p>
        </div>
      </body>
    </html>
  `
})

const PASSWORD_RESET_TEMPLATE = (resetLink: string) => ({
  subject: 'Reset your SocialCal password',
  html: `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-top: 4px solid #6366f1; padding-top: 20px;">
          <h1 style="color: #1a1a1a; font-size: 32px; font-weight: 700; margin: 0 0 24px;">Reset Your Password</h1>

          <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 0 0 16px;">
            We received a request to reset the password for your SocialCal account.
          </p>

          <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 0 0 16px;">
            Click the button below to choose a new password:
          </p>

          <a href="${resetLink}" style="background-color: #6366f1; border-radius: 8px; color: #fff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; display: block; padding: 16px 32px; margin: 32px 0;">
            Reset Password
          </a>

          <div style="background-color: #f9fafb; padding: 24px; border-left: 4px solid #6366f1; margin: 32px 0; border-radius: 8px;">
            <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 12px;">Important Information:</p>
            <p style="color: #525f7f; font-size: 15px; line-height: 24px; margin: 0;">
              " This link will expire in 1 hour for security<br />
              " The link can only be used once<br />
              " If you didn't request this, you can safely ignore this email
            </p>
          </div>

          <p style="color: #9ca3af; font-size: 14px; line-height: 22px; margin: 32px 0 8px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>

          <p style="color: #6366f1; font-size: 13px; word-break: break-all; margin: 0 0 24px;">
            ${resetLink}
          </p>

          <div style="background-color: #fef3c7; padding: 16px; border-left: 4px solid #f59e0b; margin: 24px 0; border-radius: 8px;">
            <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0;">
              = <strong>Security reminder:</strong> Never share your password or reset link with anyone. SocialCal staff will never ask for your password.
            </p>
          </div>

          <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 32px 0 0;">
            Best regards,<br />
            The SocialCal Team
          </p>
        </div>
      </body>
    </html>
  `
})

const EMAIL_CONFIRMATION_TEMPLATE = (confirmationLink: string) => ({
  subject: 'Confirm your email address',
  html: `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-top: 4px solid #6366f1; padding-top: 20px;">
          <h1 style="color: #1a1a1a; font-size: 32px; font-weight: 700; margin: 0 0 24px;">Welcome to SocialCal! =K</h1>

          <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 0 0 16px;">
            Thanks for signing up! We're excited to have you on board.
          </p>

          <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 0 0 16px;">
            To get started, please confirm your email address by clicking the button below:
          </p>

          <a href="${confirmationLink}" style="background-color: #6366f1; border-radius: 8px; color: #fff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; display: block; padding: 16px 32px; margin: 32px 0;">
            Confirm Email Address
          </a>

          <div style="background-color: #ede9fe; padding: 24px; border-left: 4px solid #6366f1; margin: 32px 0; border-radius: 8px;">
            <p style="color: #4f46e5; font-size: 18px; font-weight: 600; margin: 0 0 12px;">What's Next?</p>
            <p style="color: #525f7f; font-size: 15px; line-height: 24px; margin: 0;">
              After confirming your email, you'll be able to:<br /><br />
               Connect your social media accounts<br />
               Schedule posts across multiple platforms<br />
               Generate AI-powered captions<br />
               Track your social media performance
            </p>
          </div>

          <p style="color: #9ca3af; font-size: 14px; line-height: 22px; margin: 24px 0 8px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>

          <p style="color: #6366f1; font-size: 13px; word-break: break-all; margin: 0 0 24px;">
            ${confirmationLink}
          </p>

          <p style="color: #9ca3af; font-size: 14px; line-height: 22px; margin: 24px 0 8px;">
            This link will expire in 24 hours. If you didn't create an account with SocialCal, you can safely ignore this email.
          </p>

          <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 32px 0 0;">
            Best regards,<br />
            The SocialCal Team
          </p>
        </div>
      </body>
    </html>
  `
})

// Verify webhook signature using Standard Webhooks library
function verifyWebhook(payload: string, headers: Headers): any {
  try {
    // Convert Headers to plain object for Standard Webhooks library
    const headersObj: Record<string, string> = {}
    headers.forEach((value, key) => {
      headersObj[key] = value
    })

    console.log('Verifying webhook with headers:', JSON.stringify(headersObj))

    // Standard Webhooks library handles all the verification
    const verified = wh.verify(payload, headersObj)
    console.log('Webhook verification successful')

    return verified
  } catch (error) {
    console.error('Webhook verification failed:', error)
    throw error
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
      },
    })
  }

  try {
    // Get the raw body for signature verification
    const body = await req.text()

    // Verify webhook signature using Standard Webhooks library
    let payload
    try {
      payload = verifyWebhook(body, req.headers)
      console.log('Received auth email webhook:', payload.type || payload.email_action_type)
    } catch (error) {
      console.error('Webhook verification failed:', error)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const {
      email,
      token_hash,
      email_action_type,
      redirect_to,
      site_url,
      token
    } = payload

    // Build the verification URL
    const verificationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}${redirect_to ? `&redirect_to=${redirect_to}` : ''}`

    let emailTemplate
    let toEmail = email

    // Select appropriate template based on email type
    switch (email_action_type) {
      case 'signup':
      case 'invite':
        emailTemplate = EMAIL_CONFIRMATION_TEMPLATE(verificationUrl)
        break

      case 'recovery':
        emailTemplate = PASSWORD_RESET_TEMPLATE(verificationUrl)
        break

      case 'magiclink':
        emailTemplate = MAGIC_LINK_TEMPLATE(verificationUrl, token)
        break

      case 'email_change':
        emailTemplate = {
          subject: 'Confirm your new email address',
          html: EMAIL_CONFIRMATION_TEMPLATE(verificationUrl).html
        }
        break

      default:
        console.error('Unknown email action type:', email_action_type)
        return new Response(JSON.stringify({ error: 'Unknown email type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'SocialCal <no-reply@socialcal.app>',
      to: toEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    })

    if (error) {
      console.error('Resend error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('Email sent successfully:', data?.id)

    return new Response(JSON.stringify({ success: true, emailId: data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

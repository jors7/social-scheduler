import { getResendClient, EMAIL_FROM, REPLY_TO } from './resend';
import { ReactElement } from 'react';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
}

export async function sendEmail({ to, subject, react, replyTo }: SendEmailOptions) {
  try {
    const resend = getResendClient();

    console.log('📧 Sending email:', {
      to,
      subject,
      from: EMAIL_FROM,
      hasReactComponent: !!react
    });

    // Resend handles React Email components directly
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      react, // Pass React component directly to Resend
      replyTo: replyTo || REPLY_TO,
    });

    if (error) {
      console.error('❌ Failed to send email:', error);
      return { success: false, error };
    }

    console.log('✅ Email sent successfully:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('Error details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Specific email sending functions

export async function sendWelcomeEmail(to: string, userName: string) {
  const { default: WelcomeEmail } = await import('./templates/welcome');

  return sendEmail({
    to,
    subject: 'Welcome to SocialCal! 🎉',
    react: WelcomeEmail({ userName }),
  });
}

export async function sendMagicLinkEmail(to: string, magicLink: string) {
  const { default: MagicLinkEmail } = await import('./templates/magic-link');

  return sendEmail({
    to,
    subject: 'Your SocialCal Login Link',
    react: MagicLinkEmail({ magicLink }),
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const { default: ResetPasswordEmail } = await import('./templates/reset-password');

  return sendEmail({
    to,
    subject: 'Reset Your SocialCal Password',
    react: ResetPasswordEmail({ resetLink }),
  });
}

export async function sendTrialStartedEmail(to: string, userName: string, planName: string, passwordSetupLink?: string) {
  const { default: TrialStartedEmail } = await import('./templates/trial-started');

  return sendEmail({
    to,
    subject: `Your ${planName} Trial Has Started! 🚀`,
    react: TrialStartedEmail({ userName, planName, passwordSetupLink }),
  });
}

export async function sendSubscriptionCreatedEmail(
  to: string,
  userName: string,
  planName: string,
  billingCycle: string,
  amount: number,
  passwordSetupLink?: string
) {
  const { default: SubscriptionCreatedEmail } = await import('./templates/subscription-created');

  return sendEmail({
    to,
    subject: `Welcome to ${planName}! Your subscription is active`,
    react: SubscriptionCreatedEmail({ userName, planName, billingCycle, amount, passwordSetupLink }),
  });
}

export async function sendPaymentReceiptEmail(
  to: string,
  userName: string,
  planName: string,
  amount: number,
  currency: string,
  invoiceUrl?: string
) {
  const { default: PaymentReceiptEmail } = await import('./templates/payment-receipt');

  return sendEmail({
    to,
    subject: 'Payment Received - SocialCal',
    react: PaymentReceiptEmail({ userName, planName, amount, currency, invoiceUrl }),
  });
}

export async function sendPlanUpgradedEmail(
  to: string,
  userName: string,
  oldPlan: string,
  newPlan: string,
  proratedAmount?: number
) {
  const { default: PlanUpgradedEmail } = await import('./templates/plan-upgraded');

  return sendEmail({
    to,
    subject: `Your plan has been upgraded to ${newPlan}! 🎉`,
    react: PlanUpgradedEmail({ userName, oldPlan, newPlan, proratedAmount }),
  });
}

export async function sendPlanDowngradedEmail(
  to: string,
  userName: string,
  oldPlan: string,
  newPlan: string,
  effectiveDate: Date
) {
  const { default: PlanDowngradedEmail } = await import('./templates/plan-downgraded');

  return sendEmail({
    to,
    subject: 'Your subscription plan has changed',
    react: PlanDowngradedEmail({ userName, oldPlan, newPlan, effectiveDate }),
  });
}

export async function sendSubscriptionCancelledEmail(
  to: string,
  userName: string,
  planName: string,
  endDate: Date
) {
  const { default: SubscriptionCancelledEmail } = await import('./templates/subscription-cancelled');

  return sendEmail({
    to,
    subject: 'Your subscription has been cancelled',
    react: SubscriptionCancelledEmail({ userName, planName, endDate }),
  });
}

export async function sendPaymentFailedEmail(
  to: string,
  userName: string,
  amount: number,
  updatePaymentUrl: string
) {
  const { default: PaymentFailedEmail } = await import('./templates/payment-failed');

  return sendEmail({
    to,
    subject: 'Payment Failed - Action Required',
    react: PaymentFailedEmail({ userName, amount, updatePaymentUrl }),
  });
}

export async function sendPaymentRequiredEmail(
  to: string,
  userName: string,
  planName: string,
  amount: number,
  currency: string,
  paymentUrl: string,
  reason?: string
) {
  const { default: PaymentRequiredEmail } = await import('./templates/payment-required');

  return sendEmail({
    to,
    subject: 'Payment Required to Complete Upgrade',
    react: PaymentRequiredEmail({ userName, planName, amount, currency, paymentUrl, reason }),
  });
}

export async function sendContactFormToAdmin(
  userName: string,
  userEmail: string,
  subject: string,
  message: string
) {
  const { default: ContactFormAdminEmail } = await import('./templates/contact-form-admin');

  return sendEmail({
    to: 'jan@socialcal.app',
    subject: `New Contact Form: ${subject}`,
    react: ContactFormAdminEmail({ userName, userEmail, subject, message }),
    replyTo: userEmail, // Allow direct reply to user
  });
}

export async function sendContactFormConfirmation(
  userEmail: string,
  userName: string,
  subject: string
) {
  const { default: ContactFormConfirmationEmail } = await import('./templates/contact-form-confirmation');

  return sendEmail({
    to: userEmail,
    subject: 'Thank you for contacting SocialCal',
    react: ContactFormConfirmationEmail({ userName, subject }),
  });
}

export async function sendNewUserNotificationToAdmin(
  userEmail: string,
  planName: string,
  billingCycle: string,
  isTrial: boolean
) {
  const { default: NewUserAdminEmail } = await import('./templates/new-user-admin');

  return sendEmail({
    to: 'jan.orsula1@gmail.com',
    subject: `New Signup: ${userEmail}`,
    react: NewUserAdminEmail({
      userEmail,
      planName,
      billingCycle,
      isTrial,
      signupDate: new Date().toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
    }),
  });
}

// =====================================================
// QUEUED EMAIL FUNCTIONS (recommended for webhooks)
// =====================================================

/**
 * Queue a payment receipt email instead of sending immediately
 * Provides reliability with retry logic and idempotency
 */
export async function queuePaymentReceiptEmail(
  userId: string,
  to: string,
  userName: string,
  planName: string,
  amount: number,
  currency: string,
  invoiceId: string,
  invoiceUrl?: string
) {
  const { queueEmail } = await import('./queue');

  return queueEmail({
    userId,
    emailTo: to,
    emailType: 'payment_receipt',
    subject: 'Payment Received - SocialCal',
    templateData: { userName, planName, amount, currency, invoiceUrl },
    uniqueIdentifier: invoiceId,
    metadata: { invoice_id: invoiceId }
  });
}

/**
 * Queue a plan upgraded email
 */
export async function queuePlanUpgradedEmail(
  userId: string,
  to: string,
  userName: string,
  oldPlan: string,
  newPlan: string,
  subscriptionId: string,
  proratedAmount?: number,
  currency?: string
) {
  const { queueEmail } = await import('./queue');

  return queueEmail({
    userId,
    emailTo: to,
    emailType: 'plan_upgraded',
    subject: `Your plan has been upgraded to ${newPlan}! 🎉`,
    templateData: { userName, oldPlan, newPlan, proratedAmount, currency },
    uniqueIdentifier: `${subscriptionId}_upgrade_${Date.now()}`,
    metadata: { subscription_id: subscriptionId, old_plan: oldPlan, new_plan: newPlan }
  });
}

/**
 * Queue a plan downgraded email
 */
export async function queuePlanDowngradedEmail(
  userId: string,
  to: string,
  userName: string,
  oldPlan: string,
  newPlan: string,
  effectiveDate: Date,
  subscriptionId: string
) {
  const { queueEmail } = await import('./queue');

  return queueEmail({
    userId,
    emailTo: to,
    emailType: 'plan_downgraded',
    subject: 'Your subscription plan has changed',
    templateData: { userName, oldPlan, newPlan, effectiveDate },
    uniqueIdentifier: `${subscriptionId}_downgrade_${effectiveDate.toISOString()}`,
    metadata: { subscription_id: subscriptionId, effective_date: effectiveDate.toISOString() }
  });
}

/**
 * Queue a subscription cancelled email
 */
export async function queueSubscriptionCancelledEmail(
  userId: string,
  to: string,
  userName: string,
  planName: string,
  endDate: Date,
  subscriptionId: string
) {
  const { queueEmail } = await import('./queue');

  return queueEmail({
    userId,
    emailTo: to,
    emailType: 'subscription_cancelled',
    subject: 'Your subscription has been cancelled',
    templateData: { userName, planName, endDate },
    uniqueIdentifier: `${subscriptionId}_cancelled_${endDate.toISOString()}`,
    metadata: { subscription_id: subscriptionId, end_date: endDate.toISOString() }
  });
}

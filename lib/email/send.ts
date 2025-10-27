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

    // Resend handles React Email components directly
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      react, // Pass React component directly to Resend
      replyTo: replyTo || REPLY_TO,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
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

export async function sendTrialStartedEmail(to: string, userName: string, planName: string) {
  const { default: TrialStartedEmail } = await import('./templates/trial-started');

  return sendEmail({
    to,
    subject: `Your ${planName} Trial Has Started! 🚀`,
    react: TrialStartedEmail({ userName, planName }),
  });
}

export async function sendSubscriptionCreatedEmail(
  to: string,
  userName: string,
  planName: string,
  billingCycle: string,
  amount: number
) {
  const { default: SubscriptionCreatedEmail } = await import('./templates/subscription-created');

  return sendEmail({
    to,
    subject: `Welcome to ${planName}! Your subscription is active`,
    react: SubscriptionCreatedEmail({ userName, planName, billingCycle, amount }),
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

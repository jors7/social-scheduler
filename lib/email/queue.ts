/**
 * Email Queue Service
 *
 * Provides reliable email delivery with:
 * - Database-backed queue
 * - Exponential backoff retry logic
 * - Idempotency tracking
 * - Error logging
 *
 * Architecture:
 * 1. queueEmail() - Add email to pending_emails table
 * 2. Cron job calls processEmailQueue() every 5-15 minutes
 * 3. Failed emails retry with exponential backoff
 * 4. Successfully sent emails recorded in sent_emails
 */

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './send';
import {
  EmailType,
  checkEmailAlreadySent,
  recordEmailSent,
  IdempotencyOptions,
} from './idempotency';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Options for queueing an email
 */
export interface QueueEmailOptions {
  userId: string;
  emailTo: string;
  emailType: EmailType;
  subject: string;
  templateData: Record<string, any>; // Props for the email template
  scheduledFor?: Date; // Optional: delay sending (e.g., reminders)
  metadata?: Record<string, any>; // Extra context: invoice_id, subscription_id, etc.
  maxAttempts?: number; // Default: 3
  uniqueIdentifier: string; // For idempotency: invoice_id, subscription_id, etc.
}

/**
 * Queue an email for sending
 *
 * @returns pending_email ID or null if duplicate
 *
 * @example
 * await queueEmail({
 *   userId: 'user_123',
 *   emailTo: 'user@example.com',
 *   emailType: 'payment_receipt',
 *   subject: 'Payment Received',
 *   templateData: { userName: 'John', amount: 1000, currency: 'usd' },
 *   uniqueIdentifier: 'inv_abc123',
 *   metadata: { invoice_id: 'inv_abc123' }
 * });
 */
export async function queueEmail(
  options: QueueEmailOptions
): Promise<string | null> {
  const {
    userId,
    emailTo,
    emailType,
    subject,
    templateData,
    scheduledFor,
    metadata,
    maxAttempts = 3,
    uniqueIdentifier,
  } = options;

  try {
    // Check idempotency first
    const alreadySent = await checkEmailAlreadySent({
      userId,
      emailType,
      uniqueIdentifier,
      emailTo,
      metadata,
    });

    if (alreadySent) {
      console.log(`⏭️ Skipping duplicate email: ${emailType} to ${emailTo}`);
      return null;
    }

    // Insert into pending_emails queue
    const { data, error } = await supabaseAdmin
      .from('pending_emails')
      .insert({
        user_id: userId,
        email_to: emailTo,
        email_type: emailType,
        subject,
        template_data: templateData,
        status: 'pending',
        scheduled_for: scheduledFor ? scheduledFor.toISOString() : new Date().toISOString(),
        metadata: metadata || {},
        max_attempts: maxAttempts,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error queueing email:', error);
      return null;
    }

    console.log(`✅ Email queued: ${emailType} to ${emailTo} (ID: ${data.id})`);
    return data.id;
  } catch (error) {
    console.error('❌ Exception queueing email:', error);
    return null;
  }
}

/**
 * Process email queue (called by cron job)
 *
 * Processes all pending/failed emails that are:
 * - scheduled_for <= NOW
 * - attempts < max_attempts
 * - exponential backoff delay met
 *
 * @returns Stats about processed emails
 *
 * @example
 * const stats = await processEmailQueue();
 * console.log(`Sent: ${stats.sent}, Failed: ${stats.failed}, Skipped: ${stats.skipped}`);
 */
export async function processEmailQueue(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const stats = {
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Fetch emails ready to send with exponential backoff
    // Note: We fetch all pending/failed emails and filter by attempts < max_attempts in JS
    // because PostgREST doesn't support column-to-column comparison directly
    const { data: allPendingEmails, error: fetchError } = await supabaseAdmin
      .from('pending_emails')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(100); // Fetch more, filter in JS

    if (fetchError) {
      console.error('❌ Error fetching pending emails:', fetchError);
      stats.errors.push(`Fetch error: ${fetchError.message}`);
      return stats;
    }

    if (!allPendingEmails || allPendingEmails.length === 0) {
      console.log('📭 No pending emails to process');
      return stats;
    }

    // Filter emails where attempts < max_attempts (column-to-column comparison)
    const pendingEmails = allPendingEmails.filter(email => email.attempts < email.max_attempts).slice(0, 50);

    if (pendingEmails.length === 0) {
      console.log('📭 No pending emails to process (all have exceeded max attempts)');
      return stats;
    }

    console.log(`📬 Processing ${pendingEmails.length} pending emails`);

    // Process each email
    for (const email of pendingEmails) {
      try {
        // Check exponential backoff delay for failed emails
        if (email.status === 'failed' && email.last_attempt_at) {
          const backoffMs = calculateBackoff(email.attempts);
          const nextRetryTime = new Date(email.last_attempt_at).getTime() + backoffMs;

          if (Date.now() < nextRetryTime) {
            console.log(`⏰ Skipping email ${email.id} - backoff not met (retry in ${Math.round((nextRetryTime - Date.now()) / 1000)}s)`);
            stats.skipped++;
            continue;
          }
        }

        // Mark as sending
        await supabaseAdmin
          .from('pending_emails')
          .update({
            status: 'sending',
            last_attempt_at: new Date().toISOString(),
            attempts: email.attempts + 1,
          })
          .eq('id', email.id);

        // Check idempotency one more time (in case of race conditions)
        const alreadySent = await checkEmailAlreadySent({
          userId: email.user_id,
          emailType: email.email_type as EmailType,
          uniqueIdentifier: email.metadata?.invoice_id || email.metadata?.subscription_id || email.id,
          emailTo: email.email_to,
          metadata: email.metadata,
        });

        if (alreadySent) {
          console.log(`⏭️ Email ${email.id} already sent, marking as completed`);
          await supabaseAdmin
            .from('pending_emails')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', email.id);
          stats.skipped++;
          continue;
        }

        // Send the email using the appropriate template
        const result = await sendEmailFromQueue(email);

        if (result.success) {
          // Mark as sent in pending_emails
          await supabaseAdmin
            .from('pending_emails')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', email.id);

          // Record in sent_emails for idempotency
          await recordEmailSent(
            {
              userId: email.user_id,
              emailType: email.email_type as EmailType,
              uniqueIdentifier: email.metadata?.invoice_id || email.metadata?.subscription_id || email.id,
              emailTo: email.email_to,
              metadata: email.metadata,
            },
            email.id,
            result.resendId
          );

          stats.sent++;
          console.log(`✅ Email sent successfully: ${email.id}`);
        } else {
          // Mark as failed
          const isFinalAttempt = email.attempts + 1 >= email.max_attempts;

          await supabaseAdmin
            .from('pending_emails')
            .update({
              status: isFinalAttempt ? 'failed' : 'failed',
              last_error: result.error || 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', email.id);

          stats.failed++;
          stats.errors.push(`Email ${email.id}: ${result.error}`);

          if (isFinalAttempt) {
            console.error(`❌ Email ${email.id} failed permanently after ${email.attempts + 1} attempts:`, result.error);
          } else {
            console.warn(`⚠️ Email ${email.id} failed (attempt ${email.attempts + 1}/${email.max_attempts}):`, result.error);
          }
        }
      } catch (emailError) {
        console.error(`❌ Error processing email ${email.id}:`, emailError);
        stats.failed++;
        stats.errors.push(`Email ${email.id}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);

        // Mark as failed
        await supabaseAdmin
          .from('pending_emails')
          .update({
            status: 'failed',
            last_error: emailError instanceof Error ? emailError.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', email.id);
      }
    }

    console.log(`📊 Email queue processing complete:`, stats);
    return stats;
  } catch (error) {
    console.error('❌ Exception processing email queue:', error);
    stats.errors.push(`Queue error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return stats;
  }
}

/**
 * Send email from queue entry using appropriate template
 */
async function sendEmailFromQueue(email: any): Promise<{
  success: boolean;
  error?: string;
  resendId?: string;
}> {
  try {
    // Dynamically import the appropriate email template based on email_type
    let emailTemplate: any;

    switch (email.email_type) {
      case 'welcome':
        const { default: WelcomeEmail } = await import('./templates/welcome');
        emailTemplate = WelcomeEmail(email.template_data);
        break;
      case 'trial_started':
        const { default: TrialStartedEmail } = await import('./templates/trial-started');
        emailTemplate = TrialStartedEmail(email.template_data);
        break;
      case 'subscription_created':
        const { default: SubscriptionCreatedEmail } = await import('./templates/subscription-created');
        emailTemplate = SubscriptionCreatedEmail(email.template_data);
        break;
      case 'payment_receipt':
        const { default: PaymentReceiptEmail } = await import('./templates/payment-receipt');
        emailTemplate = PaymentReceiptEmail(email.template_data);
        break;
      case 'payment_failed':
        const { default: PaymentFailedEmail } = await import('./templates/payment-failed');
        emailTemplate = PaymentFailedEmail(email.template_data);
        break;
      case 'payment_required':
        const { default: PaymentRequiredEmail } = await import('./templates/payment-required');
        emailTemplate = PaymentRequiredEmail(email.template_data);
        break;
      case 'plan_upgraded':
        const { default: PlanUpgradedEmail } = await import('./templates/plan-upgraded');
        emailTemplate = PlanUpgradedEmail(email.template_data);
        break;
      case 'plan_downgraded':
        const { default: PlanDowngradedEmail } = await import('./templates/plan-downgraded');
        // Convert effectiveDate string back to Date object (JSON serialization converts Date to string)
        const downgradedData = {
          ...email.template_data,
          effectiveDate: new Date(email.template_data.effectiveDate)
        };
        emailTemplate = PlanDowngradedEmail(downgradedData);
        break;
      case 'subscription_cancelled':
        const { default: SubscriptionCancelledEmail } = await import('./templates/subscription-cancelled');
        // Convert endDate string back to Date object (JSON serialization converts Date to string)
        const cancelledData = {
          ...email.template_data,
          endDate: new Date(email.template_data.endDate)
        };
        emailTemplate = SubscriptionCancelledEmail(cancelledData);
        break;
      case 'magic_link':
        const { default: MagicLinkEmail } = await import('./templates/magic-link');
        emailTemplate = MagicLinkEmail(email.template_data);
        break;
      case 'password_reset':
        const { default: ResetPasswordEmail } = await import('./templates/reset-password');
        emailTemplate = ResetPasswordEmail(email.template_data);
        break;
      case 'affiliate_application_approved':
        const { default: AffiliateApprovedEmail } = await import('./templates/affiliate-application-approved');
        emailTemplate = AffiliateApprovedEmail(email.template_data);
        break;
      case 'affiliate_application_submitted':
        const { default: AffiliateSubmittedEmail } = await import('./templates/affiliate-application-submitted');
        emailTemplate = AffiliateSubmittedEmail(email.template_data);
        break;
      case 'affiliate_application_rejected':
        const { default: AffiliateRejectedEmail } = await import('./templates/affiliate-application-rejected');
        emailTemplate = AffiliateRejectedEmail(email.template_data);
        break;
      case 'affiliate_payout_processed':
        const { default: AffiliatePayoutEmail } = await import('./templates/affiliate-payout-processed');
        emailTemplate = AffiliatePayoutEmail(email.template_data);
        break;
      case 'affiliate_trial_started':
        const { default: AffiliateTrialStartedEmail } = await import('./templates/affiliate-trial-started');
        emailTemplate = AffiliateTrialStartedEmail(email.template_data);
        break;
      case 'affiliate_commission_earned':
      case 'affiliate_first_commission':
        const { default: AffiliateCommissionEarnedEmail } = await import('./templates/affiliate-commission-earned');
        emailTemplate = AffiliateCommissionEarnedEmail(email.template_data);
        break;
      case 'affiliate_conversion_cancelled':
        const { default: AffiliateConversionCancelledEmail } = await import('./templates/affiliate-conversion-cancelled');
        emailTemplate = AffiliateConversionCancelledEmail(email.template_data);
        break;
      default:
        return {
          success: false,
          error: `Unknown email type: ${email.email_type}`,
        };
    }

    // Send via Resend
    const result = await sendEmail({
      to: email.email_to,
      subject: email.subject,
      react: emailTemplate,
    });

    if (result.success && result.data) {
      return {
        success: true,
        resendId: result.data.id,
      };
    } else {
      return {
        success: false,
        error: typeof result.error === 'string' ? result.error : JSON.stringify(result.error) || 'Unknown error from Resend',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate exponential backoff delay in milliseconds
 *
 * Retry delays:
 * - Attempt 1: 2 minutes
 * - Attempt 2: 8 minutes
 * - Attempt 3: 32 minutes
 */
function calculateBackoff(attempt: number): number {
  const baseDelayMs = 2 * 60 * 1000; // 2 minutes
  return baseDelayMs * Math.pow(4, attempt); // Exponential: 2min, 8min, 32min
}

/**
 * Cancel a pending email (mark as cancelled)
 */
export async function cancelEmail(emailId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('pending_emails')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailId)
      .in('status', ['pending', 'failed']); // Only cancel if not already sent/sending

    if (error) {
      console.error('Error cancelling email:', error);
      return false;
    }

    console.log(`✅ Email cancelled: ${emailId}`);
    return true;
  } catch (error) {
    console.error('Exception cancelling email:', error);
    return false;
  }
}

/**
 * Get pending emails for a user (for debugging/monitoring)
 */
export async function getPendingEmailsForUser(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('pending_emails')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'sending', 'failed'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending emails:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching pending emails:', error);
    return [];
  }
}

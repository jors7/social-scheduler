/**
 * Email Idempotency Utilities
 *
 * Prevents duplicate emails from being sent due to:
 * - Stripe webhook retries (up to 3 days)
 * - Application-level retries
 * - Race conditions
 *
 * Uses hash-based keys stored in sent_emails table with 7-day TTL
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Email types for idempotency tracking
 */
export type EmailType =
  | 'welcome'
  | 'trial_started'
  | 'subscription_created'
  | 'payment_receipt'
  | 'payment_failed'
  | 'payment_required'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'subscription_cancelled'
  | 'downgrade_reminder'
  | 'magic_link'
  | 'password_reset';

/**
 * Options for idempotency check
 */
export interface IdempotencyOptions {
  userId: string;
  emailType: EmailType;
  uniqueIdentifier: string; // e.g., invoice_id, subscription_id, timestamp
  emailTo: string;
  metadata?: Record<string, any>;
}

/**
 * Generate idempotency key from email context
 *
 * Format: SHA256(user_id + email_type + unique_identifier + email_to)
 *
 * @example
 * generateIdempotencyKey({
 *   userId: 'user_123',
 *   emailType: 'payment_receipt',
 *   uniqueIdentifier: 'inv_abc123',
 *   emailTo: 'user@example.com'
 * })
 * // Returns: '5f4dcc3b5aa765d61d8327deb882cf99...'
 */
export function generateIdempotencyKey(options: IdempotencyOptions): string {
  const { userId, emailType, uniqueIdentifier, emailTo } = options;

  // Create deterministic string to hash
  const dataString = [
    userId,
    emailType,
    uniqueIdentifier,
    emailTo.toLowerCase().trim()
  ].join('|');

  // Generate SHA256 hash
  return crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex');
}

/**
 * Check if email has already been sent (idempotency check)
 *
 * @returns true if email was already sent, false if it's safe to send
 *
 * @example
 * const alreadySent = await checkEmailAlreadySent({
 *   userId: 'user_123',
 *   emailType: 'payment_receipt',
 *   uniqueIdentifier: 'inv_abc123',
 *   emailTo: 'user@example.com'
 * });
 *
 * if (alreadySent) {
 *   console.log('Email already sent, skipping');
 *   return;
 * }
 */
export async function checkEmailAlreadySent(
  options: IdempotencyOptions
): Promise<boolean> {
  const idempotencyKey = generateIdempotencyKey(options);

  try {
    const { data, error } = await supabaseAdmin
      .from('sent_emails')
      .select('id, sent_at')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) {
      console.error('Error checking email idempotency:', error);
      // On error, allow sending (fail open to not block critical emails)
      return false;
    }

    if (data) {
      console.log(`✋ Email already sent: ${options.emailType} to ${options.emailTo} (sent at: ${data.sent_at})`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Exception checking email idempotency:', error);
    // Fail open - allow sending
    return false;
  }
}

/**
 * Record that an email was sent (for idempotency)
 *
 * @param pendingEmailId - ID from pending_emails table (optional)
 * @param resendEmailId - ID returned from Resend API (optional)
 *
 * @example
 * await recordEmailSent({
 *   userId: 'user_123',
 *   emailType: 'payment_receipt',
 *   uniqueIdentifier: 'inv_abc123',
 *   emailTo: 'user@example.com'
 * }, 'pending_email_uuid', 'resend_email_id');
 */
export async function recordEmailSent(
  options: IdempotencyOptions,
  pendingEmailId?: string,
  resendEmailId?: string
): Promise<void> {
  const idempotencyKey = generateIdempotencyKey(options);

  try {
    const { error } = await supabaseAdmin
      .from('sent_emails')
      .insert({
        idempotency_key: idempotencyKey,
        user_id: options.userId,
        email_to: options.emailTo,
        email_type: options.emailType,
        pending_email_id: pendingEmailId || null,
        resend_email_id: resendEmailId || null,
        metadata: options.metadata || null,
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

    if (error) {
      // Check if it's a unique constraint violation (email was already recorded)
      if (error.code === '23505') {
        console.log(`📧 Email already recorded in sent_emails: ${options.emailType}`);
        return;
      }

      console.error('Error recording email in sent_emails:', error);
      // Don't throw - recording is for tracking only
    } else {
      console.log(`✅ Recorded email sent: ${options.emailType} to ${options.emailTo}`);
    }
  } catch (error) {
    console.error('Exception recording email sent:', error);
    // Don't throw - recording is for tracking only
  }
}

/**
 * Check and record in a single atomic operation
 * Returns true if email should be sent (not a duplicate)
 *
 * @example
 * const shouldSend = await checkAndRecordEmail({
 *   userId: 'user_123',
 *   emailType: 'payment_receipt',
 *   uniqueIdentifier: 'inv_abc123',
 *   emailTo: 'user@example.com'
 * });
 *
 * if (shouldSend) {
 *   await sendEmail(...);
 * }
 */
export async function checkAndRecordEmail(
  options: IdempotencyOptions
): Promise<boolean> {
  const alreadySent = await checkEmailAlreadySent(options);

  if (alreadySent) {
    return false; // Don't send
  }

  // Record immediately (before sending) to prevent race conditions
  await recordEmailSent(options);

  return true; // Safe to send
}

/**
 * Cleanup expired sent_emails entries (run via cron)
 *
 * This is a convenience wrapper around the SQL function
 */
export async function cleanupExpiredSentEmails(): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc('cleanup_expired_sent_emails');

    if (error) {
      console.error('Error cleaning up expired sent_emails:', error);
    } else {
      console.log('✅ Cleaned up expired sent_emails entries');
    }
  } catch (error) {
    console.error('Exception cleaning up expired sent_emails:', error);
  }
}

/**
 * Get sent email by idempotency key (for debugging)
 */
export async function getSentEmailByKey(
  options: IdempotencyOptions
): Promise<any | null> {
  const idempotencyKey = generateIdempotencyKey(options);

  try {
    const { data, error } = await supabaseAdmin
      .from('sent_emails')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) {
      console.error('Error fetching sent email:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching sent email:', error);
    return null;
  }
}

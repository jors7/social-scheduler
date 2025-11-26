/**
 * Post Idempotency Tracking
 * Prevents duplicate posts when retry happens after DB failure
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface PostAttemptRecord {
  id: string;
  scheduled_post_id: string;
  platform: string;
  account_id: string;
  idempotency_key: string;
  status: 'pending' | 'posting' | 'posted' | 'failed';
  platform_post_id?: string;
  error_message?: string;
  created_at: string;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Generate idempotency key for a post attempt
 */
export function generatePostIdempotencyKey(
  scheduledPostId: string,
  platform: string,
  accountId: string
): string {
  const data = `${scheduledPostId}:${platform}:${accountId}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Check if a post has already been successfully sent
 * Returns the existing record if found, null otherwise
 */
export async function checkPostAttempt(
  scheduledPostId: string,
  platform: string,
  accountId: string
): Promise<PostAttemptRecord | null> {
  const supabase = getServiceClient();
  const idempotencyKey = generatePostIdempotencyKey(scheduledPostId, platform, accountId);

  const { data, error } = await supabase
    .from('post_attempts')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (error) {
    // Not found or other error - safe to proceed
    return null;
  }

  return data as PostAttemptRecord;
}

/**
 * Record a post attempt before posting
 * Returns true if this is a new attempt, false if already exists
 */
export async function recordPostAttempt(
  scheduledPostId: string,
  platform: string,
  accountId: string
): Promise<{ isNew: boolean; existingRecord?: PostAttemptRecord }> {
  const supabase = getServiceClient();
  const idempotencyKey = generatePostIdempotencyKey(scheduledPostId, platform, accountId);

  // Try to insert - will fail if idempotency key already exists
  const { data, error } = await supabase
    .from('post_attempts')
    .insert({
      scheduled_post_id: scheduledPostId,
      platform,
      account_id: accountId,
      idempotency_key: idempotencyKey,
      status: 'posting',
    })
    .select()
    .single();

  if (error) {
    // Check if it's a duplicate key error
    if (error.code === '23505') {
      // Duplicate - fetch existing record
      const existing = await checkPostAttempt(scheduledPostId, platform, accountId);
      return { isNew: false, existingRecord: existing || undefined };
    }
    console.error('Error recording post attempt:', error);
    // Other error - let the calling code decide
    return { isNew: true };
  }

  return { isNew: true };
}

/**
 * Update post attempt after successful posting
 */
export async function markPostAttemptSuccess(
  scheduledPostId: string,
  platform: string,
  accountId: string,
  platformPostId?: string
): Promise<void> {
  const supabase = getServiceClient();
  const idempotencyKey = generatePostIdempotencyKey(scheduledPostId, platform, accountId);

  await supabase
    .from('post_attempts')
    .update({
      status: 'posted',
      platform_post_id: platformPostId,
      updated_at: new Date().toISOString(),
    })
    .eq('idempotency_key', idempotencyKey);
}

/**
 * Update post attempt after failed posting
 */
export async function markPostAttemptFailed(
  scheduledPostId: string,
  platform: string,
  accountId: string,
  errorMessage: string
): Promise<void> {
  const supabase = getServiceClient();
  const idempotencyKey = generatePostIdempotencyKey(scheduledPostId, platform, accountId);

  await supabase
    .from('post_attempts')
    .update({
      status: 'failed',
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('idempotency_key', idempotencyKey);
}

/**
 * Get all successful post attempts for a scheduled post
 * Used to check partial success when recovering stuck posts
 */
export async function getSuccessfulAttempts(
  scheduledPostId: string
): Promise<PostAttemptRecord[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('post_attempts')
    .select('*')
    .eq('scheduled_post_id', scheduledPostId)
    .eq('status', 'posted');

  if (error) {
    console.error('Error getting successful attempts:', error);
    return [];
  }

  return (data || []) as PostAttemptRecord[];
}

/**
 * Get all post attempts for a scheduled post
 * Returns both successful and failed attempts
 */
export async function getAllPostAttempts(
  scheduledPostId: string
): Promise<PostAttemptRecord[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('post_attempts')
    .select('*')
    .eq('scheduled_post_id', scheduledPostId);

  if (error) {
    console.error('Error getting post attempts:', error);
    return [];
  }

  return (data || []) as PostAttemptRecord[];
}

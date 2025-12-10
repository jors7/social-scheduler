/**
 * API Version Monitoring System - Alert Sending with Deduplication
 */

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';
import { APIIssue, AlertRecord } from './types';

// Admin emails to notify
const ADMIN_EMAILS = ['jan@socialcal.app'];

// Deduplication window in hours
const DEDUPLICATION_WINDOW_HOURS = 24;

/**
 * Get Supabase admin client (bypasses RLS)
 */
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * Send alert for API issue (with deduplication)
 * Returns true if alert was sent, false if deduplicated
 */
export async function sendAPIAlert(issue: APIIssue): Promise<boolean> {
  try {
    // Check if we've already alerted for this issue recently
    const isDuplicate = await checkDuplicateAlert(issue.id);

    if (isDuplicate) {
      console.log(`[API Monitor] Alert skipped (duplicate): ${issue.id}`);
      return false;
    }

    // Record the alert first (prevents race conditions)
    await recordAlert(issue);

    // Send email to admins
    const { default: APIDeprecationAlertEmail } = await import(
      '@/lib/email/templates/api-deprecation-alert'
    );

    for (const adminEmail of ADMIN_EMAILS) {
      await sendEmail({
        to: adminEmail,
        subject: `[${issue.severity.toUpperCase()}] ${issue.platform} API: ${formatIssueType(issue.type)}`,
        react: APIDeprecationAlertEmail({
          issue,
          dashboardUrl: 'https://www.socialcal.app/admin/api-status'
        })
      });
    }

    console.log(`[API Monitor] Alert sent: ${issue.id} (${issue.platform} - ${issue.type})`);
    return true;
  } catch (error) {
    console.error('[API Monitor] Failed to send alert:', error);
    // Fail open - if we can't check duplicates, don't block
    return false;
  }
}

/**
 * Check if we've already sent an alert for this issue within the deduplication window
 */
async function checkDuplicateAlert(issueId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const windowStart = new Date(
      Date.now() - DEDUPLICATION_WINDOW_HOURS * 60 * 60 * 1000
    );

    const { data, error } = await supabase
      .from('api_alerts')
      .select('id')
      .eq('issue_id', issueId)
      .gte('alerted_at', windowStart.toISOString())
      .limit(1);

    if (error) {
      console.error('[API Monitor] Duplicate check error:', error.message);
      // Fail open - if we can't check, allow sending
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('[API Monitor] Duplicate check failed:', error);
    return false;
  }
}

/**
 * Record an alert in the database
 */
async function recordAlert(issue: APIIssue): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const expiresAt = new Date(
      Date.now() + DEDUPLICATION_WINDOW_HOURS * 60 * 60 * 1000
    );

    const { error } = await supabase.from('api_alerts').insert({
      issue_id: issue.id,
      platform: issue.platform,
      severity: issue.severity,
      issue_type: issue.type,
      message: issue.message,
      details: issue.details,
      recommended_action: issue.recommendedAction,
      alerted_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    });

    if (error) {
      console.error('[API Monitor] Failed to record alert:', error.message);
    }
  } catch (error) {
    console.error('[API Monitor] Record alert failed:', error);
  }
}

/**
 * Get recent alerts (for admin dashboard)
 */
export async function getRecentAlerts(days: number = 7): Promise<AlertRecord[]> {
  try {
    const supabase = getSupabaseAdmin();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('api_alerts')
      .select('*')
      .gte('alerted_at', since.toISOString())
      .order('alerted_at', { ascending: false });

    if (error) {
      console.error('[API Monitor] Get recent alerts error:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[API Monitor] Get recent alerts failed:', error);
    return [];
  }
}

/**
 * Cleanup expired alert records (can be called from a cron job)
 */
export async function cleanupExpiredAlerts(): Promise<number> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('api_alerts')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('[API Monitor] Cleanup error:', error.message);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      console.log(`[API Monitor] Cleaned up ${count} expired alerts`);
    }
    return count;
  } catch (error) {
    console.error('[API Monitor] Cleanup failed:', error);
    return 0;
  }
}

/**
 * Format issue type for display
 */
function formatIssueType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

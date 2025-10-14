import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';

/**
 * Cron job to refresh TikTok tokens before they expire
 * TikTok tokens expire after 24 hours, so we refresh them every 12 hours
 *
 * This endpoint should be called by Vercel Cron or similar scheduler
 * Recommended schedule: every 12 hours (e.g., 0 0,12 * * *)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get all active TikTok accounts that expire within 6 hours or have no expiry set
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const { data: accounts, error: fetchError } = await supabase
      .from('social_accounts')
      .select('id, user_id, username, display_name, access_token, refresh_token, expires_at')
      .eq('platform', 'tiktok')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.lt.${sixHoursFromNow}`);

    if (fetchError) {
      console.error('[TikTok Token Refresh Cron] Error fetching accounts:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      console.log('[TikTok Token Refresh Cron] No TikTok accounts need token refresh');
      return NextResponse.json({
        success: true,
        message: 'No accounts need refresh',
        refreshed: 0
      });
    }

    console.log(`[TikTok Token Refresh Cron] Found ${accounts.length} TikTok accounts that need token refresh`);

    const results = {
      total: accounts.length,
      succeeded: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Refresh tokens for each account
    for (const account of accounts) {
      try {
        if (!account.refresh_token) {
          console.error(`[TikTok Token Refresh Cron] No refresh token for account ${account.username} (${account.id})`);
          results.failed++;
          results.errors.push(`${account.username}: No refresh token available`);
          continue;
        }

        console.log(`[TikTok Token Refresh Cron] Refreshing token for ${account.username}...`);

        // Use refresh_token grant type for long-lived tokens
        const refreshUrl = TIKTOK_TOKEN_URL;
        const tokenParams = new URLSearchParams({
          client_key: CLIENT_KEY,
          client_secret: CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: account.refresh_token,
        });

        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenParams.toString(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[TikTok Token Refresh Cron] Failed to refresh token for ${account.username}:`, errorText);
          results.failed++;
          results.errors.push(`${account.username}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.error) {
          console.error(`[TikTok Token Refresh Cron] API error for ${account.username}:`, data.error);
          results.failed++;
          results.errors.push(`${account.username}: ${data.error_description || data.error}`);
          continue;
        }

        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token || account.refresh_token;
        const expiresIn = data.expires_in || 86400; // Default to 24 hours
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Update the account with new token
        const { error: updateError } = await supabase
          .from('social_accounts')
          .update({
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);

        if (updateError) {
          console.error(`[TikTok Token Refresh Cron] Failed to update token for ${account.username}:`, updateError);
          results.failed++;
          results.errors.push(`${account.username}: Database update failed`);
          continue;
        }

        console.log(`[TikTok Token Refresh Cron] ✓ Successfully refreshed token for ${account.username}`);
        results.succeeded++;

      } catch (error) {
        console.error(`[TikTok Token Refresh Cron] Exception for account ${account.username}:`, error);
        results.failed++;
        results.errors.push(`${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[TikTok Token Refresh Cron] Completed: ${results.succeeded} succeeded, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('[TikTok Token Refresh Cron] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh TikTok tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

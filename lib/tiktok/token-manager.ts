import { createClient } from '@/lib/supabase/server';

const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';

interface TikTokAccount {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  username?: string;
}

interface TokenRefreshResult {
  success: boolean;
  newToken?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Check if a TikTok token needs to be refreshed
 * TikTok tokens expire after 24 hours, refresh if:
 * - Token is expired
 * - Token expires within 2 hours
 */
export async function checkTikTokTokenExpiry(accountId: string): Promise<{
  needsRefresh: boolean;
  isExpired: boolean;
  account: TikTokAccount | null;
}> {
  try {
    const supabase = await createClient();

    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('id, user_id, access_token, refresh_token, expires_at, username')
      .eq('id', accountId)
      .eq('platform', 'tiktok')
      .single();

    if (error || !account) {
      console.error('[TikTok Token Manager] Account not found:', accountId);
      return { needsRefresh: false, isExpired: false, account: null };
    }

    if (!account.expires_at) {
      // No expiry set, assume it needs refresh (legacy tokens)
      console.log('[TikTok Token Manager] No expiry date set, needs refresh');
      return { needsRefresh: true, isExpired: true, account };
    }

    const now = new Date();
    const expiresAt = new Date(account.expires_at);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const isExpired = expiresAt <= now;
    const expiresWithinTwoHours = expiresAt <= twoHoursFromNow;

    console.log('[TikTok Token Manager] Token status:', {
      accountId,
      username: account.username,
      expiresAt: expiresAt.toISOString(),
      isExpired,
      expiresWithinTwoHours,
      needsRefresh: isExpired || expiresWithinTwoHours
    });

    return {
      needsRefresh: isExpired || expiresWithinTwoHours,
      isExpired,
      account
    };
  } catch (error) {
    console.error('[TikTok Token Manager] Error checking token expiry:', error);
    return { needsRefresh: false, isExpired: false, account: null };
  }
}

/**
 * Refresh a TikTok access token using the refresh token
 * TikTok v2 API uses refresh_token grant type
 */
export async function refreshTikTokToken(account: TikTokAccount): Promise<TokenRefreshResult> {
  try {
    if (!account.refresh_token) {
      console.error('[TikTok Token Manager] No refresh token available for account:', account.id);
      return {
        success: false,
        error: 'No refresh token available. User must reconnect their TikTok account.'
      };
    }

    console.log('[TikTok Token Manager] Refreshing token for account:', account.username || account.id);

    // Use refresh_token grant type to get a new access token
    const tokenParams = new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    });

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TikTok Token Manager] Token refresh failed:', errorText);
      return {
        success: false,
        error: `Failed to refresh token: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();

    if (data.error) {
      console.error('[TikTok Token Manager] Token refresh error:', data.error, data.error_description);
      return {
        success: false,
        error: data.error_description || data.error
      };
    }

    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token || account.refresh_token; // Use new refresh token if provided
    const expiresIn = data.expires_in || 86400; // Default to 24 hours
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Update the token in the database
    const supabase = await createClient();
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
      console.error('[TikTok Token Manager] Failed to update token in database:', updateError);
      return {
        success: false,
        error: 'Failed to save refreshed token'
      };
    }

    console.log('[TikTok Token Manager] ✓ Successfully refreshed token, expires in', Math.floor(expiresIn / 3600), 'hours');

    return {
      success: true,
      newToken: newAccessToken,
      expiresAt
    };
  } catch (error) {
    console.error('[TikTok Token Manager] Error refreshing token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Ensure a TikTok token is valid, refreshing if necessary
 * Call this before making any TikTok API requests
 */
export async function ensureTikTokTokenValid(accountId: string): Promise<{
  valid: boolean;
  token?: string;
  error?: string;
}> {
  const { needsRefresh, isExpired, account } = await checkTikTokTokenExpiry(accountId);

  if (!account) {
    return { valid: false, error: 'Account not found' };
  }

  if (!needsRefresh) {
    // Token is still valid
    return { valid: true, token: account.access_token };
  }

  // Token needs refresh
  const { success, newToken, error } = await refreshTikTokToken(account);

  if (success && newToken) {
    return { valid: true, token: newToken };
  }

  // Refresh failed
  if (isExpired) {
    // Token is expired and refresh failed - user must reconnect
    return {
      valid: false,
      error: 'TikTok token expired and refresh failed. Please reconnect your TikTok account.'
    };
  }

  // Token not expired yet but refresh failed - use existing token
  console.warn('[TikTok Token Manager] Token refresh failed but token not expired yet, using existing token');
  return { valid: true, token: account.access_token };
}

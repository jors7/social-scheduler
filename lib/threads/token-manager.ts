import { createClient } from '@/lib/supabase/server';

/**
 * Check if a Threads token needs refresh (within 7 days of expiry)
 */
export async function checkThreadsTokenExpiry(accountId?: string): Promise<{
  needsRefresh: boolean;
  isExpired: boolean;
  account?: any;
}> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { needsRefresh: false, isExpired: false };
  }

  let query = supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .eq('is_active', true);

  if (accountId) {
    query = query.eq('id', accountId);
  }

  const { data: accounts } = await query;
  
  if (!accounts || accounts.length === 0) {
    return { needsRefresh: false, isExpired: false };
  }

  const account = accounts[0];
  
  if (!account.expires_at) {
    // No expiration set, assume it needs refresh
    return { needsRefresh: true, isExpired: false, account };
  }

  const now = new Date();
  const expiryDate = new Date(account.expires_at);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const isExpired = expiryDate <= now;
  const needsRefresh = expiryDate <= sevenDaysFromNow;
  
  console.log('Token expiry check:', {
    accountId: account.id,
    expiresAt: account.expires_at,
    isExpired,
    needsRefresh,
    daysUntilExpiry: Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  });
  
  return { needsRefresh, isExpired, account };
}

/**
 * Refresh a Threads token
 */
export async function refreshThreadsToken(account: any): Promise<{
  success: boolean;
  newToken?: string;
  error?: string;
}> {
  try {
    console.log('Attempting to refresh Threads token for account:', account.id);
    
    // Threads API token refresh endpoint
    const refreshUrl = 'https://graph.threads.net/refresh_access_token';
    const params = new URLSearchParams({
      grant_type: 'th_exchange_token',
      access_token: account.access_token
    });

    const response = await fetch(`${refreshUrl}?${params}`, {
      method: 'GET'
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to refresh token:', error);
      return { 
        success: false, 
        error: 'Token refresh failed. Please reconnect your account.' 
      };
    }

    const data = await response.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 5184000; // Default to 60 days

    // Update the token in the database
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('social_accounts')
      .update({
        access_token: newToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Failed to update token in database:', updateError);
      return { 
        success: false, 
        error: 'Failed to save refreshed token' 
      };
    }

    console.log('Successfully refreshed Threads token');
    return { success: true, newToken };
  } catch (error) {
    console.error('Error refreshing Threads token:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get a valid Threads token, refreshing if necessary
 */
export async function getValidThreadsToken(accountId?: string): Promise<{
  token?: string;
  account?: any;
  error?: string;
}> {
  const { needsRefresh, isExpired, account } = await checkThreadsTokenExpiry(accountId);
  
  if (!account) {
    return { error: 'No Threads account found' };
  }

  // If token is expired or needs refresh, try to refresh it
  if (needsRefresh || isExpired) {
    console.log(`Token ${isExpired ? 'expired' : 'expiring soon'}, attempting refresh...`);
    const { success, newToken, error } = await refreshThreadsToken(account);
    
    if (!success) {
      // If refresh fails and token is expired, we can't proceed
      if (isExpired) {
        return { error: error || 'Token expired and refresh failed' };
      }
      // If refresh fails but token isn't expired yet, use the existing token
      console.warn('Token refresh failed but token not expired yet, using existing token');
      return { token: account.access_token, account };
    }
    
    // Return the new token
    return { token: newToken, account: { ...account, access_token: newToken } };
  }

  // Token is still valid
  return { token: account.access_token, account };
}
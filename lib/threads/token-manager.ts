import { createClient } from '@/lib/supabase/server';

/**
 * Check if a Threads token needs refresh
 * Threads tokens can be refreshed after 1 day but before 60 days
 * We'll refresh if token is older than 1 day or expires within 7 days
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
  
  const now = new Date();
  
  // Check when the token was last updated
  const lastUpdated = account.updated_at ? new Date(account.updated_at) : null;
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const canRefresh = lastUpdated ? lastUpdated < oneDayAgo : true;
  
  if (!account.expires_at) {
    // No expiration set, needs refresh
    return { needsRefresh: true, isExpired: false, account };
  }

  const expiryDate = new Date(account.expires_at);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const isExpired = expiryDate <= now;
  // Refresh if: expired, expires within 7 days AND token is older than 1 day
  // We need both conditions to avoid refreshing too frequently
  const needsRefresh = isExpired || (expiryDate <= sevenDaysFromNow && canRefresh);
  
  console.log('Token expiry check:', {
    accountId: account.id,
    expiresAt: account.expires_at,
    lastUpdated: account.updated_at,
    isExpired,
    needsRefresh,
    canRefresh,
    daysUntilExpiry: Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  });
  
  return { needsRefresh, isExpired, account };
}

/**
 * Refresh a Threads token
 * Uses th_refresh_token grant type for long-lived tokens
 */
export async function refreshThreadsToken(account: any): Promise<{
  success: boolean;
  newToken?: string;
  error?: string;
}> {
  try {
    console.log('Attempting to refresh Threads token for account:', account.id);
    
    // Check if token is at least 1 day old (Threads requirement)
    const lastUpdated = account.updated_at ? new Date(account.updated_at) : null;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    if (lastUpdated && lastUpdated > oneDayAgo) {
      console.log('Token is less than 24 hours old, cannot refresh yet');
      return { 
        success: false, 
        error: 'Token must be at least 24 hours old to refresh' 
      };
    }
    
    // Threads API token refresh endpoint
    // Use th_refresh_token for refreshing long-lived tokens
    const refreshUrl = 'https://graph.threads.net/refresh_access_token';
    const params = new URLSearchParams({
      grant_type: 'th_refresh_token',
      access_token: account.access_token
    });

    console.log('Refreshing token with grant_type: th_refresh_token');
    const response = await fetch(`${refreshUrl}?${params}`, {
      method: 'GET'
    });

    const responseText = await response.text();
    console.log('Refresh response status:', response.status);
    
    if (!response.ok) {
      console.error('Failed to refresh token:', responseText);
      
      // Parse error if possible
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', errorData);
        
        // If error indicates invalid token, we need to reconnect
        // Mark the account as inactive to prevent further posting attempts
        if (errorData.error?.code === 190 ||
            errorData.error?.message?.includes('Invalid OAuth') ||
            errorData.error?.message?.includes('Error validating access token')) {

          // Mark account as needing reconnection (set is_active to false)
          try {
            const supabase = await createClient();
            await supabase
              .from('social_accounts')
              .update({
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', account.id);
            console.warn(`Marked Threads account ${account.id} as inactive due to expired token`);
          } catch (dbError) {
            console.error('Failed to mark account as inactive:', dbError);
          }

          return {
            success: false,
            error: 'Token is expired. Please reconnect your Threads account.'
          };
        }
      } catch (e) {
        // Not JSON, use raw text
      }
      
      return { 
        success: false, 
        error: 'Token refresh failed. Please reconnect your account.' 
      };
    }

    const data = JSON.parse(responseText);
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 5183944; // Default to ~60 days (exact: 5183944 seconds)

    if (!newToken) {
      console.error('No access token in refresh response:', data);
      return { 
        success: false, 
        error: 'No new token received from refresh' 
      };
    }

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

    console.log('Successfully refreshed Threads token, expires in', Math.floor(expiresIn / 86400), 'days');
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
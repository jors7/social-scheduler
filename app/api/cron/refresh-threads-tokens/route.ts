import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// This can be called manually or via cron to refresh Threads tokens
export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized (from Vercel Cron or manual with auth)
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    // Check if it's from Vercel Cron
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // If not from cron, check if user is authenticated
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const supabase = await createClient();
    
    // Get all Threads accounts that might need refresh
    // We'll check accounts that:
    // 1. Have an expiration date within 7 days
    // 2. Haven't been updated in the last 24 hours
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const { data: accounts, error: fetchError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('platform', 'threads')
      .eq('is_active', true)
      .or(`expires_at.lte.${sevenDaysFromNow.toISOString()},expires_at.is.null`)
      .lte('updated_at', oneDayAgo.toISOString());
    
    if (fetchError) {
      console.error('Error fetching Threads accounts:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }
    
    if (!accounts || accounts.length === 0) {
      console.log('No Threads accounts need token refresh');
      return NextResponse.json({ 
        success: true, 
        message: 'No accounts need refresh',
        checked: 0 
      });
    }
    
    console.log(`Found ${accounts.length} Threads accounts to check for refresh`);
    
    const results = {
      total: accounts.length,
      refreshed: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    };
    
    // Process each account
    for (const account of accounts) {
      try {
        console.log(`Checking account ${account.id} (${account.username})`);
        
        // Use th_refresh_token grant type for long-lived tokens
        const refreshUrl = 'https://graph.threads.net/refresh_access_token';
        const params = new URLSearchParams({
          grant_type: 'th_refresh_token',
          access_token: account.access_token
        });
        
        const response = await fetch(`${refreshUrl}?${params}`, {
          method: 'GET'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to refresh token for ${account.username}:`, errorText);
          
          // Check if it's a "too soon" error
          if (errorText.includes('24 hours')) {
            console.log('Token is less than 24 hours old, skipping');
            results.skipped++;
            continue;
          }
          
          results.failed++;
          results.errors.push(`${account.username}: ${errorText.slice(0, 100)}`);
          continue;
        }
        
        const data = await response.json();
        const newToken = data.access_token;
        const expiresIn = data.expires_in || 5183944; // ~60 days
        
        if (!newToken) {
          console.error(`No token in response for ${account.username}`);
          results.failed++;
          results.errors.push(`${account.username}: No token in response`);
          continue;
        }
        
        // Update the token in the database
        const { error: updateError } = await supabase
          .from('social_accounts')
          .update({
            access_token: newToken,
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);
        
        if (updateError) {
          console.error(`Failed to update token for ${account.username}:`, updateError);
          results.failed++;
          results.errors.push(`${account.username}: Database update failed`);
          continue;
        }
        
        console.log(`Successfully refreshed token for ${account.username}`);
        results.refreshed++;
        
      } catch (error) {
        console.error(`Error processing account ${account.username}:`, error);
        results.failed++;
        results.errors.push(`${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log('Token refresh complete:', results);
    
    return NextResponse.json({
      success: true,
      results
    });
    
  } catch (error) {
    console.error('Error in token refresh cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
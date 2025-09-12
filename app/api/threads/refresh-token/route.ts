import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refreshThreadsToken } from '@/lib/threads/token-manager';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from request body if provided
    const body = await request.json().catch(() => ({}));
    const accountId = body.accountId;

    // Get all Threads accounts for the user
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountsError } = await query;

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'No Threads accounts found' },
        { status: 404 }
      );
    }

    const results = [];
    
    // Try to refresh each account's token
    for (const account of accounts) {
      const now = new Date();
      const expiryDate = account.expires_at ? new Date(account.expires_at) : null;
      const lastUpdated = account.updated_at ? new Date(account.updated_at) : null;
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Check if token can be refreshed (must be at least 24 hours old)
      const canRefresh = lastUpdated ? lastUpdated < oneDayAgo : true;
      
      // Check if token needs refresh (expired or expiring soon)
      const isExpired = expiryDate ? expiryDate <= now : true;
      const expiringSoon = expiryDate ? expiryDate <= sevenDaysFromNow : true;
      
      if (!canRefresh && !isExpired) {
        results.push({
          accountId: account.id,
          username: account.username,
          status: 'skipped',
          reason: 'Token is less than 24 hours old',
          expiresAt: account.expires_at,
          lastUpdated: account.updated_at
        });
        continue;
      }

      if (!isExpired && !expiringSoon) {
        results.push({
          accountId: account.id,
          username: account.username,
          status: 'skipped',
          reason: 'Token is still valid for more than 7 days',
          expiresAt: account.expires_at,
          daysUntilExpiry: expiryDate ? Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
        });
        continue;
      }

      // Try to refresh the token
      const { success, newToken, error } = await refreshThreadsToken(account);
      
      results.push({
        accountId: account.id,
        username: account.username,
        status: success ? 'refreshed' : 'failed',
        error: error,
        expiresAt: success ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() : account.expires_at,
        daysUntilExpiry: success ? 60 : (expiryDate ? Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0)
      });
    }

    // Check if any tokens failed to refresh and are expired
    const criticalFailures = results.filter(r => 
      r.status === 'failed' && (r.daysUntilExpiry ?? 0) <= 0
    );

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        refreshed: results.filter(r => r.status === 'refreshed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        criticalFailures: criticalFailures.length
      },
      needsReconnect: criticalFailures.length > 0
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh tokens' },
      { status: 500 }
    );
  }
}

// GET endpoint to check token status without refreshing
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all Threads accounts for the user
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .eq('is_active', true);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'No Threads accounts found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const statuses = accounts.map(account => {
      const expiryDate = account.expires_at ? new Date(account.expires_at) : null;
      const lastUpdated = account.updated_at ? new Date(account.updated_at) : null;
      const daysUntilExpiry = expiryDate ? Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : -1;
      const hoursSinceUpdate = lastUpdated ? Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)) : -1;
      
      return {
        accountId: account.id,
        username: account.username,
        expiresAt: account.expires_at,
        lastUpdated: account.updated_at,
        daysUntilExpiry,
        hoursSinceUpdate,
        isExpired: daysUntilExpiry <= 0,
        needsRefresh: daysUntilExpiry <= 7,
        canRefresh: hoursSinceUpdate >= 24
      };
    });

    return NextResponse.json({
      success: true,
      accounts: statuses,
      summary: {
        total: statuses.length,
        expired: statuses.filter(s => s.isExpired).length,
        needingRefresh: statuses.filter(s => s.needsRefresh).length,
        canRefresh: statuses.filter(s => s.canRefresh).length
      }
    });
  } catch (error) {
    console.error('Token status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check token status' },
      { status: 500 }
    );
  }
}
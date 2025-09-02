import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { accountId, currentToken } = await request.json();

    if (!accountId || !currentToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Threads API uses long-lived tokens (60 days)
    // We can exchange them for new ones before they expire
    const refreshUrl = 'https://graph.threads.net/refresh_access_token';
    const params = new URLSearchParams({
      grant_type: 'th_exchange_token',
      access_token: currentToken
    });

    const response = await fetch(refreshUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    if (!response.ok) {
      // If refresh fails, return error so client knows to reconnect
      console.error('Token refresh failed:', await response.text());
      return NextResponse.json({ 
        error: 'Token refresh failed',
        requiresReconnect: true 
      }, { status: 400 });
    }

    const data = await response.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 5184000; // 60 days default

    // Update token in database
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { error: updateError } = await supabase
      .from('social_accounts')
      .update({ 
        access_token: newToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh token',
      requiresReconnect: true 
    }, { status: 500 });
  }
}

// Check if token needs refresh (within 7 days of expiry)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check all Threads accounts
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('id, platform, expires_at, access_token')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .eq('is_active', true);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to check accounts' }, { status: 500 });
    }

    const needsRefresh = [];
    const expired = [];
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const account of accounts || []) {
      if (account.expires_at) {
        const expiryDate = new Date(account.expires_at);
        if (expiryDate < now) {
          expired.push(account.id);
        } else if (expiryDate < sevenDaysFromNow) {
          needsRefresh.push({
            id: account.id,
            expiresAt: account.expires_at
          });
        }
      }
    }

    return NextResponse.json({
      needsRefresh,
      expired,
      checked: accounts?.length || 0
    });

  } catch (error) {
    console.error('Token check error:', error);
    return NextResponse.json({ error: 'Failed to check tokens' }, { status: 500 });
  }
}
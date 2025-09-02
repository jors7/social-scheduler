import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Threads Deauthorize ===');
    
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

    // Get existing Threads account to revoke
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'threads');

    if (accounts && accounts.length > 0) {
      for (const account of accounts) {
        if (account.access_token) {
          try {
            // Try to revoke the token with Meta
            const revokeUrl = `https://graph.facebook.com/v18.0/me/permissions?access_token=${account.access_token}`;
            await fetch(revokeUrl, { method: 'DELETE' });
            console.log('Revoked token for account:', account.username);
          } catch (error) {
            console.error('Error revoking token:', error);
          }
        }
      }
    }

    // Delete all Threads accounts from database
    const { error: deleteError } = await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'threads');

    if (deleteError) {
      console.error('Error deleting accounts:', deleteError);
    }

    // Clear all OAuth state cookies
    cookieStore.delete('threads_oauth_state');
    
    // Clear any Meta session cookies we can access
    const cookiesToClear = [
      'fbm_', 'fbsr_', 'fbs_', // Facebook
      'ig_cb', 'ig_did', 'sessionid', // Instagram
      'threads_', // Threads
    ];
    
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      for (const prefix of cookiesToClear) {
        if (cookie.name.startsWith(prefix)) {
          cookieStore.delete(cookie.name);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All Threads/Meta authorizations cleared',
      clearedAccounts: accounts?.length || 0
    });
  } catch (error) {
    console.error('Deauthorize error:', error);
    return NextResponse.json({ error: 'Failed to deauthorize' }, { status: 500 });
  }
}
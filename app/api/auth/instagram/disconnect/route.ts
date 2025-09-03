import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function revokeInstagramPermissions(accessToken: string, igUserId?: string) {
  try {
    const base = 'https://graph.facebook.com/v20.0';
    const url = igUserId
      ? `${base}/${igUserId}/permissions`
      : `${base}/me/permissions`;

    const response = await fetch(`${url}?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      console.log('Successfully revoked Instagram permissions');
      return true;
    } else {
      const error = await response.text();
      console.log('Failed to revoke permissions:', error);
      // Don't throw - token might be expired which is fine
      return false;
    }
  } catch (error) {
    console.log('Error revoking permissions (token might be expired):', error);
    // Don't throw - we still want to clean up locally
    return false;
  }
}

export async function POST(request: NextRequest) {
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

    // Get the Instagram account details before deleting
    const { data: account } = await supabase
      .from('social_accounts')
      .select('access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .single();

    // Revoke permissions on Instagram's side if we have a token
    if (account?.access_token) {
      await revokeInstagramPermissions(account.access_token, account.platform_user_id);
    }

    // Delete the Instagram account record entirely
    // This ensures a clean reconnection flow
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'instagram');

    if (error) {
      console.error('Failed to disconnect Instagram account:', error);
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    // Clear any OAuth cookies
    cookieStore.delete('instagram_oauth_state');

    return NextResponse.json({ 
      success: true, 
      message: 'Instagram account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
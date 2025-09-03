import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateAppSecretProof(accessToken: string, appSecret: string): string {
  return crypto
    .createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex');
}

async function revokeInstagramPermissions(accessToken: string, igUserId?: string) {
  // For Instagram Business Login tokens, use Facebook Graph API
  // Instagram tokens (IGAA format) should work with Facebook's permission endpoint
  try {
    // Get app secret for appsecret_proof (optional but recommended)
    const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET;
    
    // Build the URL with just the access token
    // The Facebook Graph API should handle Instagram Business Login tokens
    const url = new URL('https://graph.facebook.com/v20.0/me/permissions');
    url.searchParams.append('access_token', accessToken);
    
    // Add app secret proof if available
    if (appSecret) {
      const appSecretProof = generateAppSecretProof(accessToken, appSecret);
      url.searchParams.append('appsecret_proof', appSecretProof);
    }
    
    const response = await fetch(url.toString(), { 
      method: 'DELETE',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      // Success - permissions revoked
      return true;
    } else {
      // Log the error but don't fail - token might be expired or already revoked
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        // Check for specific error codes that mean the token is already invalid
        if (errorJson.error?.code === 190 || // Invalid OAuth access token
            errorJson.error?.code === 102 || // Session key invalid or no longer valid
            errorJson.error?.code === 467) { // Invalid access token
          // Token is already invalid, which achieves our goal
          return true;
        }
      } catch {
        // Not JSON, just log the text
      }
      return false;
    }
  } catch (error) {
    // Network error or other issue - continue with local cleanup
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
    let revokeSuccess = false;
    if (account?.access_token) {
      revokeSuccess = await revokeInstagramPermissions(account.access_token, account.platform_user_id);
      if (!revokeSuccess) {
        console.log('⚠️ Failed to revoke Instagram permissions, but continuing with local cleanup');
      }
    } else {
      console.log('No access token found, skipping revocation');
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
      message: 'Instagram account disconnected successfully',
      revokeSuccess: revokeSuccess,
      note: revokeSuccess 
        ? 'Permissions successfully revoked from Instagram'
        : 'Local data cleared. To fully disconnect, you may need to manually revoke access in your Instagram settings.'
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
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
  console.log('=== Attempting to revoke Instagram permissions ===');
  console.log('Has access token:', !!accessToken);
  console.log('Instagram user ID:', igUserId || 'not provided');
  
  // Get app secret for appsecret_proof
  const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET;
  
  // Try multiple approaches to ensure revocation works
  const attempts = [];
  
  // Attempt 1: Try Instagram Graph API with user ID
  if (igUserId) {
    try {
      const appSecretProof = appSecret ? generateAppSecretProof(accessToken, appSecret) : '';
      const params = new URLSearchParams({
        access_token: accessToken,
        ...(appSecretProof && { appsecret_proof: appSecretProof })
      });
      
      const url = `https://graph.instagram.com/v20.0/${igUserId}/permissions?${params}`;
      console.log('Attempt 1: DELETE to Instagram API with user ID');
      
      const response = await fetch(url, { method: 'DELETE' });
      const result = await response.text();
      
      if (response.ok) {
        console.log('✅ Successfully revoked via Instagram API with user ID');
        return true;
      }
      console.log('Instagram API with user ID failed:', response.status, result);
      attempts.push({ method: 'instagram_user_id', status: response.status, error: result });
    } catch (error) {
      console.log('Instagram API with user ID error:', error);
      attempts.push({ method: 'instagram_user_id', error: String(error) });
    }
  }
  
  // Attempt 2: Try Facebook Graph API with me endpoint
  try {
    const appSecretProof = appSecret ? generateAppSecretProof(accessToken, appSecret) : '';
    const params = new URLSearchParams({
      access_token: accessToken,
      ...(appSecretProof && { appsecret_proof: appSecretProof })
    });
    
    const url = `https://graph.facebook.com/v20.0/me/permissions?${params}`;
    console.log('Attempt 2: DELETE to Facebook API with /me endpoint');
    
    const response = await fetch(url, { method: 'DELETE' });
    const result = await response.text();
    
    if (response.ok) {
      console.log('✅ Successfully revoked via Facebook API');
      return true;
    }
    console.log('Facebook API /me failed:', response.status, result);
    attempts.push({ method: 'facebook_me', status: response.status, error: result });
  } catch (error) {
    console.log('Facebook API /me error:', error);
    attempts.push({ method: 'facebook_me', error: String(error) });
  }
  
  // Attempt 3: Try Facebook Graph API with user ID if available
  if (igUserId) {
    try {
      const appSecretProof = appSecret ? generateAppSecretProof(accessToken, appSecret) : '';
      const params = new URLSearchParams({
        access_token: accessToken,
        ...(appSecretProof && { appsecret_proof: appSecretProof })
      });
      
      const url = `https://graph.facebook.com/v20.0/${igUserId}/permissions?${params}`;
      console.log('Attempt 3: DELETE to Facebook API with user ID');
      
      const response = await fetch(url, { method: 'DELETE' });
      const result = await response.text();
      
      if (response.ok) {
        console.log('✅ Successfully revoked via Facebook API with user ID');
        return true;
      }
      console.log('Facebook API with user ID failed:', response.status, result);
      attempts.push({ method: 'facebook_user_id', status: response.status, error: result });
    } catch (error) {
      console.log('Facebook API with user ID error:', error);
      attempts.push({ method: 'facebook_user_id', error: String(error) });
    }
  }
  
  console.log('❌ All revocation attempts failed:', attempts);
  console.log('Token might be expired or already revoked, proceeding with local cleanup');
  return false;
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
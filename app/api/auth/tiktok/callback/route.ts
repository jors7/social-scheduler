import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// TikTok v2 API endpoints
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle user denial
    if (error) {
      console.error('TikTok OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=tiktok_auth_denied&details=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=tiktok_auth_failed', request.url)
      );
    }

    // Verify state for CSRF protection
    const cookieStore = cookies();
    const storedState = cookieStore.get('tiktok_oauth_state')?.value;
    const codeVerifier = cookieStore.get('tiktok_code_verifier')?.value;
    
    if (!storedState || storedState !== state || !codeVerifier) {
      console.error('State mismatch or missing code verifier');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=tiktok_auth_invalid', request.url)
      );
    }

    // Exchange code for access token with PKCE (v2 API)
    const tokenParams = new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
      code_verifier: codeVerifier,
    });

    console.log('Exchanging code for token at:', TIKTOK_TOKEN_URL);
    console.log('Token params:', {
      client_key: CLIENT_KEY ? `${CLIENT_KEY.substring(0, 5)}...` : 'NOT SET',
      has_code: !!code,
      has_code_verifier: !!codeVerifier,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
    });
    
    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=tiktok_token_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token response:', {
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      scope: tokenData.scope,
      expires_in: tokenData.expires_in,
      error: tokenData.error,
      error_description: tokenData.error_description,
    });
    
    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error, tokenData.error_description);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=tiktok_token_error&details=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url)
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 86400; // Default to 24 hours
    const openId = tokenData.open_id;

    // Get user info using the access token (v2 API)
    let userInfo = null;
    try {
      const userResponse = await fetch(`${TIKTOK_USER_INFO_URL}?fields=open_id,union_id,avatar_url,display_name`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        userInfo = userData.data?.user || userData.data; // v2 API structure
        console.log('TikTok user info:', userInfo);
      } else {
        console.error('Failed to fetch user info:', await userResponse.text());
      }
    } catch (userError) {
      console.error('Error fetching TikTok user info:', userError);
      // Continue anyway - we have the tokens
    }

    // Store in database
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
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', request.url)
      );
    }

    // Store the account info
    const platformUserId = openId || userInfo?.open_id || `tiktok_${user.id}`;
    const username = userInfo?.display_name || 'TikTok User';
    const profileImageUrl = userInfo?.avatar_url || null;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    
    // Check if this account already exists
    const { data: existingAccount } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .single();

    if (existingAccount) {
      // Update existing account
      const { error: dbError } = await supabase
        .from('social_accounts')
        .update({
          platform_user_id: platformUserId,
          username: username,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_image_url: profileImageUrl,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);
        
      if (dbError) {
        console.error('Database update error:', dbError);
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=tiktok_db_failed', request.url)
        );
      }
    } else {
      // Insert new account
      const { error: dbError } = await supabase
        .from('social_accounts')
        .insert({
          user_id: user.id,
          platform: 'tiktok',
          platform_user_id: platformUserId,
          username: username,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_image_url: profileImageUrl,
          is_active: true,
          expires_at: expiresAt
        });
        
      if (dbError) {
        console.error('Database insert error:', dbError);
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=tiktok_db_failed', request.url)
        );
      }
    }

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=tiktok_db_failed', request.url)
      );
    }

    // Clear the OAuth cookies
    const redirectResponse = NextResponse.redirect(
      new URL('/dashboard/settings?success=tiktok_connected', request.url)
    );
    
    redirectResponse.cookies.delete('tiktok_oauth_state');
    redirectResponse.cookies.delete('tiktok_code_verifier');
    
    return redirectResponse;

  } catch (error) {
    console.error('TikTok callback error:', error);
    
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=tiktok_error', request.url)
    );
  }
}
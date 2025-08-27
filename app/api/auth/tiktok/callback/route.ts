import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// TikTok Login Kit v1 uses different endpoints
const TIKTOK_TOKEN_URL = 'https://open-api.tiktok.com/oauth/access_token/';
const TIKTOK_USER_INFO_URL = 'https://open-api.tiktok.com/oauth/userinfo/';
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
    
    if (!storedState || storedState !== state) {
      console.error('State mismatch');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=tiktok_auth_invalid', request.url)
      );
    }

    // Exchange code for access token (v1 API doesn't use PKCE)
    const tokenParams = new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
    });

    console.log('Exchanging code for token at:', TIKTOK_TOKEN_URL);
    console.log('Token params:', {
      client_key: CLIENT_KEY ? `${CLIENT_KEY.substring(0, 5)}...` : 'NOT SET',
      has_code: !!code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
    });
    
    const tokenResponse = await fetch(`${TIKTOK_TOKEN_URL}?${tokenParams.toString()}`, {
      method: 'GET', // v1 uses GET for token exchange
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
      has_data: !!tokenData.data,
      error_code: tokenData.error_code,
      message: tokenData.message,
    });

    // v1 API wraps response in 'data' object
    const data = tokenData.data || tokenData;
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in || 86400; // Default to 24 hours
    const openId = data.open_id;

    // Get user info using the access token (v1 API)
    let userInfo = null;
    try {
      const userParams = new URLSearchParams({
        open_id: openId,
        access_token: accessToken,
      });
      
      const userResponse = await fetch(`${TIKTOK_USER_INFO_URL}?${userParams.toString()}`, {
        method: 'GET',
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        userInfo = userData.data || userData; // v1 API structure
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
    const accountData = {
      user_id: user.id,
      platform: 'tiktok',
      platform_user_id: openId || userInfo?.open_id || `tiktok_${user.id}`,
      account_name: userInfo?.display_name || userInfo?.nickname || 'TikTok Account',
      username: userInfo?.display_name || userInfo?.nickname || 'TikTok User',
      profile_image_url: userInfo?.avatar_url || userInfo?.avatar || null,
      access_token: accessToken,
      refresh_token: refreshToken,
      is_active: true,
      expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    };

    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert(accountData, {
        onConflict: 'user_id,platform'
      });

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
    
    return redirectResponse;

  } catch (error) {
    console.error('TikTok callback error:', error);
    
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=tiktok_error', request.url)
    );
  }
}
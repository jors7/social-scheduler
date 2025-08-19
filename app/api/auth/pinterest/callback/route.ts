import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user denial
    if (error) {
      console.error('Pinterest OAuth error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=pinterest_auth_denied', request.url)
      );
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=pinterest_auth_failed', request.url)
      );
    }

    // Exchange code for access token
    const tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/pinterest/callback`,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=pinterest_token_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Get user info
    const userResponse = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get user info');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=pinterest_user_failed', request.url)
      );
    }

    const userData = await userResponse.json();

    // Store in database
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
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', request.url)
      );
    }

    // Store the account info
    const accountData = {
      user_id: user.id,
      platform: 'pinterest',
      platform_user_id: userData.id || userData.username,
      account_name: userData.business_name || userData.username,
      username: userData.username,
      profile_image_url: userData.profile_image || null,
      access_token: accessToken,
      refresh_token: refreshToken,
      is_active: true,
      expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    };

    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert(accountData, {
        onConflict: 'user_id,platform'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=pinterest_db_failed', request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/dashboard/settings?success=pinterest_connected', request.url)
    );

  } catch (error) {
    console.error('Pinterest callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=pinterest_error', request.url)
    );
  }
}
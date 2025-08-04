import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ThreadsService } from '@/lib/threads/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads OAuth Callback ===');
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Threads OAuth error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_auth_failed', request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_auth_failed', request.url)
      );
    }

    // Verify state for CSRF protection
    const cookieStore = cookies();
    const storedState = cookieStore.get('threads_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      console.error('Invalid state parameter');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_auth_failed', request.url)
      );
    }

    // Clear state cookie
    cookieStore.delete('threads_oauth_state');

    // Exchange code for access token
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://social-scheduler-opal.vercel.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    const tokenParams = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID!,
      client_secret: process.env.THREADS_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for token...');
    // Threads uses Facebook Graph API for token exchange with GET request
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?${tokenParams.toString()}`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_auth_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token received, getting user info...');

    // Exchange short-lived token for long-lived token
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.THREADS_APP_ID!,
      client_secret: process.env.THREADS_APP_SECRET!,
      fb_exchange_token: tokenData.access_token,
    });

    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?${longLivedParams.toString()}`
    );

    let accessToken = tokenData.access_token;
    let expiresIn = tokenData.expires_in;

    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json();
      accessToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in;
      console.log('Got long-lived token');
    }

    // Get user info - First get Facebook user ID
    const fbUserResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
    );
    
    if (!fbUserResponse.ok) {
      console.error('Failed to get Facebook user info');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_auth_failed', request.url)
      );
    }
    
    const fbUserData = await fbUserResponse.json();
    
    // Then get Threads profile using Facebook user ID
    const userResponse = await fetch(
      `https://graph.threads.net/v1.0/${fbUserData.id}?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${accessToken}`
    );

    if (!userResponse.ok) {
      console.error('Failed to get user info');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_auth_failed', request.url)
      );
    }

    const userData = await userResponse.json();
    console.log('User data received:', userData.username);

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
        new URL('/dashboard/settings?error=unauthorized', request.url)
      );
    }

    const accountData = {
      user_id: user.id,
      platform: 'threads',
      platform_user_id: userData.id,
      account_name: userData.username,
      username: userData.username,
      profile_image_url: userData.threads_profile_picture_url,
      access_token: accessToken,
      access_secret: '', // Threads doesn't use access secret
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
        new URL('/dashboard/settings?error=database_error', request.url)
      );
    }

    console.log('Threads account connected successfully');
    return NextResponse.redirect(
      new URL('/dashboard/settings?success=threads_connected', request.url)
    );

  } catch (error) {
    console.error('Threads callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=threads_callback_failed', request.url)
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads OAuth Callback ===');
    console.log('Full callback URL:', request.url);
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    console.log('Callback parameters:', {
      code: code ? `${code.substring(0, 10)}...` : 'missing',
      state: state,
      error: error,
      allParams: Object.fromEntries(searchParams.entries())
    });

    if (error) {
      console.error('Threads OAuth error:', error);
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }

    if (!code) {
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }

    // Verify state for CSRF protection
    const cookieStore = cookies();
    const storedState = cookieStore.get('threads_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      console.error('Invalid state parameter');
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }

    // Clear state cookie
    cookieStore.delete('threads_oauth_state');

    // Exchange code for access token
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // MUST use THREADS_APP_ID, not the main Meta App ID!
    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET; // Fallback to META_APP_SECRET
    
    const tokenParams = new URLSearchParams({
      client_id: appId!,
      client_secret: appSecret!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for token...');
    console.log('Token exchange parameters:', {
      client_id: appId?.substring(0, 5) + '...',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code: code.substring(0, 10) + '...'
    });
    
    // Use the official Threads Graph API token endpoint
    console.log('Exchanging code for token with Threads API...');
    const tokenUrl = `https://graph.threads.net/oauth/access_token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString()
    });
    
    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token received, getting user info...');

    // For Threads, we use the token directly
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;
    const userId = tokenData.user_id; // Threads returns user_id in token response
    
    console.log('Got Threads access token for user:', userId);

    // Get Threads user info using the user_id from token response
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/${userId || 'me'}?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${accessToken}`
    );
    
    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error('Failed to get user info:', errorText);
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }
    
    const userData = await meResponse.json();
    console.log('Threads user data:', userData);
    
    // For Threads API, we use the data directly
    let threadsUserId = userData.id || userId;
    let threadsUsername = userData.username;
    let threadsProfilePic = userData.threads_profile_picture_url;
    let pageAccessToken = accessToken; // Use the Threads access token
    
    // We have Threads data directly from the API
    if (!threadsUserId) {
      console.error('No Threads user ID found');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_no_user', request.url)
      );
    }
    
    const threadsAccountData = {
      id: threadsUserId,
      username: threadsUsername,
      threads_profile_picture_url: threadsProfilePic,
      threads_biography: ''
    };
    
    console.log('Threads account data:', threadsAccountData);

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
      platform_user_id: threadsAccountData.id,
      account_name: threadsAccountData.username,
      username: threadsAccountData.username,
      profile_image_url: threadsAccountData.threads_profile_picture_url,
      access_token: pageAccessToken, // Use the appropriate access token for Threads API
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
    console.error('=== THREADS CALLBACK ERROR ===');
    console.error('Error details:', error);
    console.error('Request URL:', request.url);
    
    // Use the correct base URL for redirect
    const errorRedirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.socialcal.app/dashboard/settings?error=threads_callback_failed'
      : 'http://localhost:3001/dashboard/settings?error=threads_callback_failed';
    
    return NextResponse.redirect(errorRedirectUrl);
  }
}
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
    const appSecret = process.env.THREADS_APP_SECRET || '775901361bf3c2853b0396d973d7c428';
    
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
    
    const tokenText = await tokenResponse.text();
    console.log('Token response body:', tokenText);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenText);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(tokenText);
        console.error('Token error details:', errorData);
      } catch (e) {
        console.error('Raw token error:', tokenText);
      }
      
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error('Failed to parse token response:', e);
      console.error('Token text was:', tokenText);
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }
    console.log('Token received, getting user info...');

    // For Threads, we use the token directly
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;
    const userId = tokenData.user_id; // Threads returns user_id in token response
    
    console.log('Got Threads access token for user:', userId);

    // Get Threads user info using the user_id from token response
    const profileUrl = `https://graph.threads.net/v1.0/${userId || 'me'}?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${accessToken}`;
    console.log('Fetching profile from:', profileUrl.replace(accessToken, 'TOKEN_HIDDEN'));
    
    const meResponse = await fetch(profileUrl);
    
    const profileText = await meResponse.text();
    console.log('Profile response status:', meResponse.status);
    console.log('Profile response body:', profileText);
    
    let userData = null;
    
    if (!meResponse.ok) {
      console.warn('Failed to get full user profile:', profileText);
      
      // Check if it's a permission issue
      try {
        const errorData = JSON.parse(profileText);
        if (errorData.error?.code === 100 && errorData.error?.error_subcode === 10) {
          console.log('App needs review or user needs to be tester. Using minimal data from token response.');
          // Use minimal data from the token response
          userData = {
            id: userId,
            username: `threads_user_${userId}`, // Fallback username
            threads_profile_picture_url: null,
            threads_biography: ''
          };
        } else {
          // Different error, fail the auth
          const errorUrl = process.env.NODE_ENV === 'production'
            ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
            : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
          return NextResponse.redirect(errorUrl);
        }
      } catch (e) {
        // Can't parse error, fail the auth
        const errorUrl = process.env.NODE_ENV === 'production'
          ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
          : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
        return NextResponse.redirect(errorUrl);
      }
    } else {
      // Profile fetch successful
      try {
        userData = JSON.parse(profileText);
      } catch (e) {
        console.error('Failed to parse profile response:', e);
        console.error('Profile text was:', profileText);
        const errorUrl = process.env.NODE_ENV === 'production'
          ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
          : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
        return NextResponse.redirect(errorUrl);
      }
    }
    
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
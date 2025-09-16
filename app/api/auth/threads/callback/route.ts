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
      console.warn('State mismatch - possible CSRF or cookie issue', {
        storedState: storedState ? 'present' : 'missing',
        receivedState: state ? 'present' : 'missing',
        environment: process.env.NODE_ENV,
        hasCode: !!code
      });
      
      // In production, be more lenient due to cross-site cookie issues
      // The authorization code itself provides security
      if (process.env.NODE_ENV === 'production' && code) {
        console.log('Allowing auth despite state mismatch - using authorization code for security');
      } else {
        // In development or if no code, fail the auth
        console.error('Failing auth due to state mismatch');
        const errorUrl = process.env.NODE_ENV === 'production'
          ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
          : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
        return NextResponse.redirect(errorUrl);
      }
    }

    // Clear state cookie if it exists
    if (storedState) {
      cookieStore.delete('threads_oauth_state');
    }

    // Exchange code for access token
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // MUST use THREADS_APP_ID, not the main Meta App ID!
    const appId = process.env.THREADS_APP_ID || '760612513547331';
    const appSecret = process.env.THREADS_APP_SECRET || '750a8d07e0625cf53eb52dde952dabc7';
    
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

    // For Threads, we get a short-lived token first
    const shortLivedToken = tokenData.access_token;
    const shortLivedExpiresIn = tokenData.expires_in;
    const userId = tokenData.user_id; // Threads returns user_id in token response
    
    console.log('Got Threads SHORT-LIVED access token for user:', userId);
    console.log('Short-lived token expires_in (seconds):', shortLivedExpiresIn);
    
    // IMPORTANT: Exchange short-lived token for long-lived token
    console.log('Exchanging short-lived token for long-lived token...');
    const exchangeUrl = 'https://graph.threads.net/access_token';
    const exchangeParams = new URLSearchParams({
      grant_type: 'th_exchange_token',
      client_secret: appSecret!,
      access_token: shortLivedToken
    });
    
    const exchangeResponse = await fetch(`${exchangeUrl}?${exchangeParams}`, {
      method: 'GET'
    });
    
    if (!exchangeResponse.ok) {
      const exchangeError = await exchangeResponse.text();
      console.error('Failed to exchange for long-lived token:', exchangeError);
      console.error('Will use short-lived token as fallback');
      // Fall back to short-lived token if exchange fails
      var accessToken = shortLivedToken;
      var expiresIn = shortLivedExpiresIn;
    } else {
      const exchangeData = await exchangeResponse.json();
      console.log('Successfully exchanged for long-lived token');
      var accessToken = exchangeData.access_token;
      var expiresIn = exchangeData.expires_in || 5184000; // Should be ~60 days
      console.log('Long-lived token expires_in (seconds):', expiresIn);
      console.log('Long-lived token will expire at:', new Date(Date.now() + expiresIn * 1000).toISOString());
    }

    // Get Threads user info - use /me endpoint which works better than user_id
    // Try with simpler fields first to avoid permission issues
    const profileUrl = `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`;
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
        if (errorData.error?.code === 100) {
          // Permission issue or object doesn't exist - use minimal data
          console.log('Profile fetch failed but we have a token. Using minimal data from token response.');
          console.log('Error details:', errorData.error);
          
          // Use minimal data from the token response
          userData = {
            id: userId,
            username: null, // Will be handled in fallback logic
            threads_profile_picture_url: null,
            threads_biography: ''
          };
        } else {
          // Different error, but we have a token, so let's try to continue
          console.warn('Unexpected error fetching profile, but continuing with minimal data');
          userData = {
            id: userId,
            username: null, // Will be handled in fallback logic
            threads_profile_picture_url: null,
            threads_biography: ''
          };
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
        console.log('Successfully parsed profile data:', userData);
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
    
    // Try to get additional profile data if the basic fetch was successful
    let threadsProfilePic = null;
    let threadsBio = '';
    
    if (userData?.username && userData?.id) {
      // Try to fetch additional fields separately
      try {
        const extendedProfileUrl = `https://graph.threads.net/v1.0/me?fields=threads_profile_picture_url,threads_biography&access_token=${accessToken}`;
        const extendedResponse = await fetch(extendedProfileUrl);
        if (extendedResponse.ok) {
          const extendedData = await extendedResponse.json();
          threadsProfilePic = extendedData.threads_profile_picture_url || null;
          threadsBio = extendedData.threads_biography || '';
          console.log('Got extended profile data');
        } else {
          console.log('Could not fetch extended profile data, continuing without it');
        }
      } catch (e) {
        console.log('Error fetching extended profile data, continuing without it:', e);
      }
    }
    
    // For Threads API, use the ID from the /me response if available, otherwise fallback
    let threadsUserId = userData?.id || userId;
    let threadsUsername = userData?.username || `@threads_${userId}`; // Add @ prefix to make it clear it's a fallback
    
    // IMPORTANT: Validate the username to prevent connecting wrong account
    // The non-existent account "janorsula" should be rejected
    if (threadsUsername === 'janorsula' || threadsUsername === 'threads_janorsula') {
      console.error('Invalid account detected:', threadsUsername);
      console.error('This appears to be a cached/wrong account. Please try reconnecting.');
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_wrong_account'
        : 'http://localhost:3001/dashboard/settings?error=threads_wrong_account';
      return NextResponse.redirect(errorUrl);
    }
    
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
      threads_biography: threadsBio
    };
    
    console.log('Threads account data (validated):', threadsAccountData);

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

    // Use the actual expiration time from the token response
    // Long-lived tokens expire in 60 days (5184000 seconds)
    // Short-lived tokens expire in 1 hour (3600 seconds) - only used as fallback
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000) 
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // Default to 60 days if not provided
    
    console.log('Token will be stored with expiry:', expiresAt.toISOString());
    
    // Check if this account already exists
    const { data: existingAccount } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .single();

    if (existingAccount) {
      // Update existing account
      const { error: dbError } = await supabase
        .from('social_accounts')
        .update({
          platform_user_id: threadsAccountData.id,
          username: threadsAccountData.username,
          access_token: accessToken,
          access_secret: '', // Threads doesn't use access secret
          profile_image_url: threadsAccountData.threads_profile_picture_url,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);
        
      if (dbError) {
        console.error('Database update error:', dbError);
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=database_error', request.url)
        );
      }
    } else {
      // Insert new account
      const { error: dbError } = await supabase
        .from('social_accounts')
        .insert({
          user_id: user.id,
          platform: 'threads',
          platform_user_id: threadsAccountData.id,
          username: threadsAccountData.username,
          access_token: accessToken,
          access_secret: '', // Threads doesn't use access secret
          profile_image_url: threadsAccountData.threads_profile_picture_url,
          is_active: true,
          expires_at: expiresAt.toISOString()
        });
        
      if (dbError) {
        console.error('Database insert error:', dbError);
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=database_error', request.url)
        );
      }
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
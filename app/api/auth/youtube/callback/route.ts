import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user denial
    if (error) {
      console.error('YouTube OAuth error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=youtube_auth_denied', request.url)
      );
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=youtube_auth_failed', request.url)
      );
    }

    // Verify state for CSRF protection
    const cookieStore = cookies();
    const storedState = cookieStore.get('youtube_oauth_state')?.value;
    
    console.log('State validation:', {
      received: state,
      stored: storedState,
      match: storedState === state
    });
    
    // For development, we can be less strict about state validation
    if (process.env.NODE_ENV === 'production' && (!storedState || storedState !== state)) {
      console.error('State mismatch - possible CSRF attack');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=youtube_auth_invalid', request.url)
      );
    }

    // Determine the base URL dynamically (must match the one used in initial auth)
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL;
    
    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      code: code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri: `${baseUrl}/api/auth/youtube/callback`,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(YOUTUBE_TOKEN_URL, {
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
        new URL('/dashboard/settings?error=youtube_token_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    // Try to get user's YouTube channel info
    let channel = null;
    let channelError = null;
    
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        `${baseUrl}/api/auth/youtube/callback`
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });

      // Get channel info
      const channelResponse = await youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });

      channel = channelResponse.data.items?.[0];
    } catch (channelErr) {
      console.error('Error fetching YouTube channel:', channelErr);
      channelError = channelErr;
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

    // Store the account info - handle case where channel might be null
    const accountData = {
      user_id: user.id,
      platform: 'youtube',
      platform_user_id: channel?.id || `youtube_${user.id}`,
      account_name: channel?.snippet?.title || 'YouTube Channel',
      username: channel?.snippet?.customUrl || channel?.snippet?.title || 'YouTube',
      profile_image_url: channel?.snippet?.thumbnails?.default?.url || null,
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
        new URL('/dashboard/settings?error=youtube_db_failed', request.url)
      );
    }

    // Clear the state cookie
    const redirectResponse = NextResponse.redirect(
      new URL('/dashboard/settings?success=youtube_connected', request.url)
    );
    
    redirectResponse.cookies.delete('youtube_oauth_state');
    
    return redirectResponse;

  } catch (error) {
    console.error('YouTube callback error:', error);
    
    // Provide more specific error messages
    let errorParam = 'youtube_error';
    if (error instanceof Error) {
      if (error.message.includes('channel')) {
        errorParam = 'youtube_no_channel';
      } else if (error.message.includes('token')) {
        errorParam = 'youtube_token_failed';
      }
    }
    
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${errorParam}`, request.url)
    );
  }
}
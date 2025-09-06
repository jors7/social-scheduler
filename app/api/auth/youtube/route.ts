import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const YOUTUBE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// YouTube OAuth scopes required for uploading videos
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
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

    // Check if YouTube app is configured
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      console.error('YouTube client ID or secret not configured');
      return NextResponse.json({ error: 'YouTube not configured' }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Determine the base URL dynamically
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL;
    
    console.log('YouTube OAuth redirect URI:', `${baseUrl}/api/auth/youtube/callback`);
    
    // Build YouTube OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      redirect_uri: `${baseUrl}/api/auth/youtube/callback`,
      response_type: 'code',
      scope: SCOPES,
      state: state,
      access_type: 'offline', // To get refresh token
      // Only prompt for consent on first authorization or when requesting new scopes
    });

    const authUrl = `${YOUTUBE_OAUTH_URL}?${params.toString()}`;
    
    // Store state in a cookie for verification
    const response = NextResponse.json({ 
      success: true, 
      authUrl 
    });
    
    response.cookies.set('youtube_oauth_state', state, {
      httpOnly: true,
      secure: false, // Allow in development
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/', // Make sure it's available for all paths
    });
    
    return response;

  } catch (error) {
    console.error('YouTube OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate YouTube authentication' },
      { status: 500 }
    );
  }
}

// Helper function to revoke Google/YouTube OAuth token
async function revokeYouTubeToken(accessToken: string): Promise<boolean> {
  try {
    console.log('Revoking YouTube/Google OAuth token...');
    
    // Google's OAuth2 revocation endpoint
    const revokeUrl = 'https://oauth2.googleapis.com/revoke';
    
    const response = await fetch(revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: accessToken
      })
    });

    const responseText = await response.text();
    console.log('YouTube revoke response status:', response.status);
    
    if (response.ok) {
      console.log('✅ YouTube/Google token revoked successfully');
      return true;
    } else {
      console.error('Failed to revoke YouTube token:', response.status, responseText);
      // Check for specific errors
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error === 'invalid_token') {
          console.log('Token was already invalid or expired');
        }
      } catch (e) {
        // Not JSON response
      }
      return false;
    }
  } catch (error) {
    console.error('Error revoking YouTube token:', error);
    return false;
  }
}

// Disconnect YouTube account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'disconnect') {
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

      // First, get the account details to retrieve the access token
      const { data: account } = await supabase
        .from('social_accounts')
        .select('access_token, refresh_token, username')
        .eq('user_id', user.id)
        .eq('platform', 'youtube')
        .single();

      // Revoke the token if we have one
      let revokeSuccess = false;
      if (account?.access_token) {
        revokeSuccess = await revokeYouTubeToken(account.access_token);
        if (!revokeSuccess && account.refresh_token) {
          // Try revoking refresh token if access token revocation failed
          console.log('Trying to revoke refresh token instead...');
          revokeSuccess = await revokeYouTubeToken(account.refresh_token);
        }
      } else {
        console.log('No YouTube access token found, skipping revocation');
      }

      // Delete the account from our database
      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'youtube');

      if (error) {
        console.error('Error disconnecting YouTube:', error);
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
      }

      console.log(`YouTube account ${account?.username || 'unknown'} disconnected${revokeSuccess ? ' and revoked' : ''}`);
      return NextResponse.json({ success: true, revoked: revokeSuccess });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('YouTube action error:', error);
    return NextResponse.json(
      { error: 'Failed to process YouTube action' },
      { status: 500 }
    );
  }
}
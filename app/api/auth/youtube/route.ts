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
    
    // Build YouTube OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`,
      response_type: 'code',
      scope: SCOPES,
      state: state,
      access_type: 'offline', // To get refresh token
      prompt: 'consent', // Force consent to get refresh token
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

      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'youtube');

      if (error) {
        console.error('Error disconnecting YouTube:', error);
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
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
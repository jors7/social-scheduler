import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// TikTok v2 OAuth endpoint (v1 deprecated Feb 2024 for web apps)
const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';

// TikTok v2 scopes
const SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'user.info.stats',
  'video.list',
  'video.publish',
].join(',');

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

    // Check if TikTok app is configured
    if (!CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
      console.error('TikTok client key or secret not configured');
      return NextResponse.json({ error: 'TikTok not configured' }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Log for debugging
    console.log('TikTok OAuth Config:', {
      clientKey: CLIENT_KEY ? `${CLIENT_KEY.substring(0, 5)}...` : 'NOT SET',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
      scopes: SCOPES,
    });

    // Generate PKCE code challenge for v2
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Build TikTok v2 OAuth URL with PKCE
    const params = new URLSearchParams({
      client_key: CLIENT_KEY,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
      response_type: 'code',
      scope: SCOPES,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${TIKTOK_AUTH_URL}?${params.toString()}`;
    console.log('Generated auth URL:', authUrl);
    
    // Store state and code verifier in cookies for verification
    const response = NextResponse.json({ 
      success: true, 
      authUrl 
    });
    
    response.cookies.set('tiktok_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    
    response.cookies.set('tiktok_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    
    return response;

  } catch (error) {
    console.error('TikTok OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate TikTok authentication' },
      { status: 500 }
    );
  }
}

// Disconnect TikTok account
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
        .eq('platform', 'tiktok');

      if (error) {
        console.error('Error disconnecting TikTok:', error);
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('TikTok action error:', error);
    return NextResponse.json(
      { error: 'Failed to process TikTok action' },
      { status: 500 }
    );
  }
}
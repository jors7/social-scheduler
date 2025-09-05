import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// TikTok v2 OAuth endpoint (v1 deprecated Feb 2024 for web apps)
const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';

// TikTok v2 scopes - basic + video publishing + upload
// CURRENT PHASE 1 SCOPES (Approved/Working):
const SCOPES = 'user.info.basic,video.publish,video.upload';

// FUTURE PHASE 2 SCOPES (DO NOT ADD UNTIL APPROVED BY TIKTOK):
// - user.info.profile: Extended profile info (bio, verification status)
// - user.info.stats: Follower/following counts, likes, video statistics
// - video.list: List user's videos for analytics and performance tracking
// 
// IMPORTANT: Adding unapproved scopes will break authentication!
// Only update after TikTok approves additional scopes.
// Future implementation: 'user.info.basic,user.info.profile,user.info.stats,video.publish,video.upload,video.list'

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

    // Ensure redirect URI is properly configured
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`;
    
    // For production, ensure we're using the correct domain
    if (process.env.NODE_ENV === 'production' && !redirectUri.includes('https://')) {
      console.error('TikTok OAuth requires HTTPS in production');
      return NextResponse.json({ 
        error: 'TikTok OAuth requires HTTPS. Please check NEXT_PUBLIC_APP_URL configuration.' 
      }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Log for debugging
    console.log('TikTok OAuth Config:', {
      clientKey: CLIENT_KEY ? `${CLIENT_KEY.substring(0, 5)}...` : 'NOT SET',
      redirectUri: redirectUri,
      scopes: SCOPES,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      environment: process.env.NODE_ENV,
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
      redirect_uri: redirectUri, // Use the validated redirect URI
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

// Helper function to revoke TikTok access token
async function revokeTikTokToken(accessToken: string): Promise<boolean> {
  try {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!clientKey || !clientSecret) {
      console.error('TikTok client credentials not configured for revocation');
      return false;
    }

    console.log('Revoking TikTok access token...');
    
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        token: accessToken
      })
    });

    if (response.ok) {
      console.log('✅ TikTok token revoked successfully');
      return true;
    } else {
      const errorText = await response.text();
      console.error('Failed to revoke TikTok token:', response.status, errorText);
      // Don't fail the disconnect even if revocation fails (token might be expired)
      return false;
    }
  } catch (error) {
    console.error('Error revoking TikTok token:', error);
    return false;
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

      // First, get the account details to retrieve the access token
      const { data: account } = await supabase
        .from('social_accounts')
        .select('access_token, username')
        .eq('user_id', user.id)
        .eq('platform', 'tiktok')
        .single();

      // Revoke the token if we have one
      let revokeSuccess = false;
      if (account?.access_token) {
        revokeSuccess = await revokeTikTokToken(account.access_token);
        if (!revokeSuccess) {
          console.log('⚠️ Failed to revoke TikTok token, but continuing with local cleanup');
        }
      } else {
        console.log('No TikTok access token found, skipping revocation');
      }

      // Delete the account from our database
      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'tiktok');

      if (error) {
        console.error('Error disconnecting TikTok:', error);
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
      }

      console.log(`TikTok account ${account?.username || 'unknown'} disconnected${revokeSuccess ? ' and revoked' : ''}`);
      return NextResponse.json({ success: true, revoked: revokeSuccess });
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
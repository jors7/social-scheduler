import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';

// LinkedIn OAuth scopes - Updated for current API
// Requires: "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn" products
const SCOPES = [
  'openid',           // OpenID Connect
  'profile',          // Basic profile  
  'email',            // Email address
  'w_member_social',  // Post on behalf of user (Share on LinkedIn product)
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

    // Check if LinkedIn app is configured
    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      console.error('LinkedIn client ID or secret not configured');
      return NextResponse.json({ error: 'LinkedIn not configured' }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Determine the base URL dynamically
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL;
    
    console.log('LinkedIn OAuth redirect URI:', `${baseUrl}/api/auth/linkedin/callback`);
    
    // Build LinkedIn OAuth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: `${baseUrl}/api/auth/linkedin/callback`,
      state: state,
      scope: SCOPES,
    });

    const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;
    
    // Log the full auth URL for debugging
    console.log('Full LinkedIn OAuth URL:', authUrl);
    console.log('Client ID:', process.env.LINKEDIN_CLIENT_ID);
    console.log('Redirect URI:', `${baseUrl}/api/auth/linkedin/callback`);
    console.log('Scopes:', SCOPES);
    
    // Store state in a cookie for verification
    const response = NextResponse.json({ 
      success: true, 
      authUrl 
    });
    
    response.cookies.set('linkedin_oauth_state', state, {
      httpOnly: true,
      secure: false, // Force insecure for localhost
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    
    console.log('LinkedIn OAuth state cookie set:', state);
    
    return response;

  } catch (error) {
    console.error('LinkedIn OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate LinkedIn authentication' },
      { status: 500 }
    );
  }
}

// Disconnect LinkedIn account
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
        .eq('platform', 'linkedin');

      if (error) {
        console.error('Error disconnecting LinkedIn:', error);
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('LinkedIn action error:', error);
    return NextResponse.json(
      { error: 'Failed to process LinkedIn action' },
      { status: 500 }
    );
  }
}
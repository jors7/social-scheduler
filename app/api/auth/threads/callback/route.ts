import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ThreadsService } from '@/lib/threads/service';

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
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for token...');
    console.log('Token exchange parameters:', {
      client_id: process.env.META_APP_ID?.substring(0, 5) + '...',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code: code.substring(0, 10) + '...'
    });
    
    // Use Facebook Graph API token exchange endpoint
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?${tokenParams.toString()}`;
    const tokenResponse = await fetch(tokenUrl);

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
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
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

    // Get Facebook user info
    const fbUserResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
    );
    
    if (!fbUserResponse.ok) {
      const errorText = await fbUserResponse.text();
      console.error('Failed to get Facebook user info:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_auth_failed', request.url)
      );
    }
    
    const fbUserData = await fbUserResponse.json();
    console.log('Facebook user data:', fbUserData);
    
    // Get user's Facebook pages (which can be used for Threads)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    
    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      console.error('Failed to get Facebook pages:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_auth_failed', request.url)
      );
    }
    
    const pagesData = await pagesResponse.json();
    console.log('Pages data:', JSON.stringify(pagesData, null, 2));
    
    if (!pagesData.data || pagesData.data.length === 0) {
      console.error('No Facebook pages found for Threads');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_no_pages', request.url)
      );
    }
    
    // Use the first page for Threads (since Threads is connected to pages)
    const page = pagesData.data[0];
    console.log('Using page for Threads:', page.name);
    
    // For now, we'll save the Facebook page info as the "Threads" account
    // In the future, when Threads API is more mature, we can get actual Threads profile info
    const userData = {
      id: page.id,
      username: page.name,
      threads_profile_picture_url: null, // Could get from page data if needed
      threads_biography: page.about || ''
    };
    
    console.log('Threads account data:', userData);

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
      access_token: page.access_token, // Use page access token for posting
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
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads OAuth Callback (Simple) ===');
    console.log('Full callback URL:', request.url);
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    console.log('Callback parameters:', {
      code: code ? `${code.substring(0, 10)}...` : 'missing',
      state: state,
      error: error,
    });

    if (error) {
      console.error('Threads OAuth error:', error);
      return NextResponse.redirect('/dashboard/settings?error=threads_auth_failed');
    }

    if (!code) {
      console.error('No code received');
      return NextResponse.redirect('/dashboard/settings?error=threads_auth_failed');
    }

    // Exchange code for access token
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;
    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET;
    
    // Exchange code for token with Threads API
    const tokenParams = new URLSearchParams({
      client_id: appId!,
      client_secret: appSecret!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for token...');
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
      return NextResponse.redirect('/dashboard/settings?error=threads_token_failed');
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error('Failed to parse token response:', e);
      return NextResponse.redirect('/dashboard/settings?error=threads_parse_failed');
    }

    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id;
    
    console.log('Got access token and user ID:', userId);

    // Get Threads user profile using the user_id from token response
    const profileUrl = `https://graph.threads.net/v1.0/${userId}?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${accessToken}`;
    console.log('Fetching profile from:', profileUrl);
    
    const profileResponse = await fetch(profileUrl);
    const profileText = await profileResponse.text();
    console.log('Profile response:', profileText);

    if (!profileResponse.ok) {
      console.error('Failed to get profile:', profileText);
      return NextResponse.redirect('/dashboard/settings?error=threads_profile_failed');
    }

    let profileData;
    try {
      profileData = JSON.parse(profileText);
    } catch (e) {
      console.error('Failed to parse profile response:', e);
      return NextResponse.redirect('/dashboard/settings?error=threads_profile_parse_failed');
    }

    console.log('Threads profile data:', profileData);

    // Store in database
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
      return NextResponse.redirect('/dashboard/settings?error=unauthorized');
    }

    const accountData = {
      user_id: user.id,
      platform: 'threads',
      platform_user_id: profileData.id || userId,
      account_name: profileData.username || 'Threads User',
      username: profileData.username || 'threads_user',
      profile_image_url: profileData.threads_profile_picture_url || null,
      access_token: accessToken,
      access_secret: '', // Threads doesn't use access secret
      is_active: true,
      expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    };

    console.log('Saving account data:', accountData);

    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert(accountData, {
        onConflict: 'user_id,platform'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect('/dashboard/settings?error=database_error');
    }

    console.log('Threads account connected successfully');
    return NextResponse.redirect('/dashboard/settings?success=threads_connected');

  } catch (error) {
    console.error('=== THREADS CALLBACK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.redirect('/dashboard/settings?error=threads_callback_failed');
  }
}
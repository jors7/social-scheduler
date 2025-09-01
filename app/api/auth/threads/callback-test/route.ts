import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads Test Callback ===');
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect('https://www.socialcal.app/dashboard/settings?error=threads_oauth_error');
    }

    if (!code) {
      console.error('No code received');
      return NextResponse.redirect('https://www.socialcal.app/dashboard/settings?error=no_code');
    }

    // Exchange code for token
    const appId = '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || '775901361bf3c2853b0396d973d7c428';
    const redirectUri = 'https://www.socialcal.app/api/auth/threads/callback';
    
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for token...');
    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Token response:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect('https://www.socialcal.app/dashboard/settings?error=token_exchange_failed');
    }

    const accessToken = tokenData.access_token;
    
    // Get profile using /me endpoint
    const profileResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
    );
    
    const profileData = await profileResponse.json();
    console.log('Profile response:', profileResponse.status);
    
    // Even if profile fails, we have a token
    const userId = profileData.id || tokenData.user_id;
    const username = profileData.username || `threads_${tokenData.user_id}`;
    
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
      return NextResponse.redirect('https://www.socialcal.app/dashboard/settings?error=not_authenticated');
    }

    const accountData = {
      user_id: user.id,
      platform: 'threads',
      platform_user_id: userId,
      account_name: username,
      username: username,
      profile_image_url: profileData.threads_profile_picture_url || null,
      access_token: accessToken,
      access_secret: '',
      is_active: true,
      expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    };

    console.log('Saving account:', username);

    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert(accountData, {
        onConflict: 'user_id,platform'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect('https://www.socialcal.app/dashboard/settings?error=database_error');
    }

    console.log('Success! Threads account connected');
    return NextResponse.redirect('https://www.socialcal.app/dashboard/settings?success=threads_connected');

  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect('https://www.socialcal.app/dashboard/settings?error=callback_error');
  }
}
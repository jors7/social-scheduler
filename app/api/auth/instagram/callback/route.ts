import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { InstagramService } from '@/lib/instagram/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Instagram OAuth Callback ===');
    console.log('Full callback URL:', request.url);
    console.log('Environment check:', {
      hasMetaAppId: !!process.env.META_APP_ID,
      hasMetaAppSecret: !!process.env.META_APP_SECRET,
      metaAppIdLength: process.env.META_APP_ID?.length,
      nodeEnv: process.env.NODE_ENV
    });
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Instagram OAuth error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    // Verify state for CSRF protection
    const cookieStore = cookies();
    const storedState = cookieStore.get('instagram_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      console.error('Invalid state parameter');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    // Clear state cookie
    cookieStore.delete('instagram_oauth_state');

    // Exchange code for access token
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    // Instagram Business Login token exchange (not Facebook!)
    const tokenBody = new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for Instagram access token...');
    // Use Instagram's token endpoint, not Facebook's
    const tokenUrl = 'https://api.instagram.com/oauth/access_token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token received:', tokenData);

    // With Instagram Business Login, the token response includes the user data directly
    // The response should include: access_token, user_id, and potentially username
    const { access_token, user_id } = tokenData;

    if (!access_token || !user_id) {
      console.error('Invalid token response:', tokenData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    // Get Instagram Business account info using the Instagram Graph API
    console.log('Fetching Instagram Business account info...');
    const profileResponse = await fetch(
      `https://graph.instagram.com/v18.0/${user_id}?fields=id,username,account_type,media_count,followers_count,follows_count,profile_picture_url,biography&access_token=${access_token}`
    );

    if (!profileResponse.ok) {
      console.error('Failed to get Instagram profile');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    const profileData = await profileResponse.json();
    console.log('Instagram profile received:', profileData.username);

    // Verify this is a Business or Creator account
    if (profileData.account_type !== 'BUSINESS' && profileData.account_type !== 'CREATOR') {
      console.error('Account is not a Business or Creator account:', profileData.account_type);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_not_business', request.url)
      );
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
        new URL('/dashboard/settings?error=unauthorized', request.url)
      );
    }

    const accountData = {
      user_id: user.id,
      platform: 'instagram',
      platform_user_id: user_id,
      account_name: profileData.username,
      username: profileData.username,
      profile_image_url: profileData.profile_picture_url,
      access_token: access_token, // Instagram Business Login access token
      access_secret: '', // Not used for Instagram
      is_active: true,
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

    console.log('Instagram account connected successfully');
    return NextResponse.redirect(
      new URL('/dashboard/settings?success=instagram_connected', request.url)
    );

  } catch (error) {
    console.error('Instagram callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=instagram_callback_failed', request.url)
    );
  }
}
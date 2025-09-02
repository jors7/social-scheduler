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

    // Facebook Graph API token exchange
    const tokenParams = new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for access token via Facebook Graph API...');
    // Use Facebook Graph API endpoint (NOT Instagram direct!)
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?${tokenParams.toString()}`;
    const tokenResponse = await fetch(tokenUrl);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token received, getting Facebook pages...');

    const { access_token } = tokenData;

    if (!access_token) {
      console.error('Invalid token response:', tokenData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    // Get user's Facebook pages to find Instagram Business accounts
    console.log('Fetching Facebook pages...');
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${access_token}`
    );

    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      console.error('Failed to get Facebook pages:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_no_pages', request.url)
      );
    }

    const pagesData = await pagesResponse.json();
    console.log('Pages data:', JSON.stringify(pagesData, null, 2));

    // Find a page with Instagram Business account
    let selectedPage = null;
    let instagramAccountId = null;

    for (const page of pagesData.data || []) {
      if (page.instagram_business_account) {
        selectedPage = page;
        instagramAccountId = page.instagram_business_account.id;
        console.log(`Found Instagram account on page: ${page.name}`);
        break;
      }
    }

    if (!selectedPage || !instagramAccountId) {
      console.error('No Instagram Business account found on any page');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_not_business', request.url)
      );
    }

    // Get Instagram Business account info
    console.log('Fetching Instagram Business account info...');
    const profileResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=id,username,account_type,media_count,followers_count,follows_count,profile_picture_url,biography&access_token=${selectedPage.access_token}`
    );

    if (!profileResponse.ok) {
      console.error('Failed to get Instagram profile');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    const profileData = await profileResponse.json();
    console.log('Instagram profile received:', profileData.username);

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
      platform_user_id: instagramAccountId,
      account_name: profileData.username,
      username: profileData.username,
      profile_image_url: profileData.profile_picture_url,
      access_token: selectedPage.access_token, // Page access token for Instagram API
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
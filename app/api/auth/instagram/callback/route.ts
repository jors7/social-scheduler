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

    console.log('=== Facebook Token Exchange for Instagram ===');
    console.log('Client ID:', process.env.META_APP_ID);
    console.log('Redirect URI:', redirectUri);
    console.log('Code length:', code.length);
    
    // Use Facebook Graph API endpoint
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?${tokenParams.toString()}`;
    console.log('Token URL:', tokenUrl.replace(process.env.META_APP_SECRET!, 'REDACTED'));
    
    const tokenResponse = await fetch(tokenUrl);

    console.log('Token response status:', tokenResponse.status);
    console.log('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed with status:', tokenResponse.status);
      console.error('Error response:', errorText);
      
      // Try to parse error as JSON if possible
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Error details:', errorJson);
      } catch (e) {
        // Not JSON, already logged as text
      }
      
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token data received:', JSON.stringify(tokenData, null, 2));

    const { access_token } = tokenData;

    if (!access_token) {
      console.error('No access token in response');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    // Get Facebook pages to find Instagram Business account
    console.log('Fetching Facebook pages...');
    const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${access_token}`;
    const pagesResponse = await fetch(pagesUrl);

    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      console.error('Failed to get Facebook pages:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_no_pages', request.url)
      );
    }

    const pagesData = await pagesResponse.json();
    console.log('Pages found:', pagesData.data?.length || 0);

    // Find page with Instagram Business account
    let instagramAccountId = null;
    let pageAccessToken = null;

    for (const page of pagesData.data || []) {
      console.log(`Checking page: ${page.name}`);
      if (page.instagram_business_account) {
        instagramAccountId = page.instagram_business_account.id;
        pageAccessToken = page.access_token;
        console.log(`Found Instagram account ID: ${instagramAccountId}`);
        break;
      }
    }

    if (!instagramAccountId || !pageAccessToken) {
      console.error('No Instagram Business account found on any Facebook page');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_not_connected', request.url)
      );
    }

    // Get Instagram profile info
    console.log('Fetching Instagram profile...');
    const profileUrl = `https://graph.facebook.com/v20.0/${instagramAccountId}?fields=id,username,profile_picture_url,followers_count,media_count&access_token=${pageAccessToken}`;
    const profileResponse = await fetch(profileUrl);

    console.log('Profile response status:', profileResponse.status);

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Failed to get Instagram profile');
      console.error('Profile fetch error:', errorText);
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
      platform_user_id: instagramAccountId, // Instagram Business account ID
      account_name: profileData.username,
      username: profileData.username,
      profile_image_url: profileData.profile_picture_url,
      access_token: pageAccessToken, // Page access token for Instagram API
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
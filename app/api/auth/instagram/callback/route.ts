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

    const tokenParams = new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for token...');
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
    console.log('Token received, getting user info...');

    // First, let's see what user we're authenticated as
    const userResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${tokenData.access_token}`
    );
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('Authenticated Facebook user:', userData);
    }

    // Get user's Facebook pages (required for Instagram Business accounts)
    console.log('Fetching Facebook pages...');
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
    );

    console.log('Pages response status:', pagesResponse.status);
    
    let pagesData = { data: [] };
    
    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      console.error('Failed to get Facebook pages:', errorText);
    } else {
      pagesData = await pagesResponse.json();
      console.log('Pages data:', JSON.stringify(pagesData, null, 2));
    }
    
    // If no personal pages found, try to get business pages
    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('No personal pages found, trying business accounts...');
      
      // Try to get business accounts
      const businessResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?type=page&access_token=${tokenData.access_token}`
      );
      
      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        console.log('Business pages data:', JSON.stringify(businessData, null, 2));
        pagesData = businessData;
      }
    }
    
    if (!pagesData.data || pagesData.data.length === 0) {
      console.error('No Facebook pages found in response:', pagesData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_no_pages', request.url)
      );
    }

    // Check all pages for Instagram connections
    let selectedPage = null;
    let instagramData = null;
    
    console.log('Checking all pages for Instagram connections...');
    for (const pageItem of pagesData.data) {
      const page = pageItem as any; // Type assertion to fix TypeScript error
      console.log(`Checking page: ${page.name} (${page.id})`);
      
      // Try multiple API endpoints to find Instagram accounts
      const endpoints = [
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account,connected_instagram_account&access_token=${page.access_token}`,
        `https://graph.facebook.com/v18.0/${page.id}/instagram_accounts?access_token=${page.access_token}`
      ];
      
      for (const endpoint of endpoints) {
        console.log(`Trying endpoint: ${endpoint.split('?')[0]}`);
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Response for ${page.name}:`, JSON.stringify(data, null, 2));
          
          if (data.instagram_business_account || data.connected_instagram_account || (data.data && data.data.length > 0)) {
            selectedPage = page;
            instagramData = data;
            console.log(`Found Instagram connection on page: ${page.name}`);
            break;
          }
        } else {
          const errorText = await response.text();
          console.log(`Endpoint failed: ${errorText}`);
        }
      }
      
      if (selectedPage) break;
    }
    
    if (!selectedPage || !instagramData) {
      console.error('No Instagram Business account found on any page');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_not_business', request.url)
      );
    }
    
    console.log('Selected page with Instagram:', JSON.stringify(selectedPage, null, 2));
    console.log('Instagram data:', JSON.stringify(instagramData, null, 2));

    // Extract Instagram account ID from different possible response formats
    let instagramAccountId;
    if (instagramData.instagram_business_account) {
      instagramAccountId = instagramData.instagram_business_account.id;
    } else if (instagramData.connected_instagram_account) {
      instagramAccountId = instagramData.connected_instagram_account.id;
    } else if (instagramData.data && instagramData.data.length > 0) {
      instagramAccountId = instagramData.data[0].id;
    } else {
      console.error('Could not extract Instagram account ID from:', instagramData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_not_business', request.url)
      );
    }
    
    console.log('Instagram Account ID:', instagramAccountId);

    // Get Instagram profile info
    const profileResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=id,username,media_count,followers_count,profile_picture_url,biography&access_token=${selectedPage.access_token}`
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
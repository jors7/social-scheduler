import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }

    if (!code) {
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }

    // Verify state for CSRF protection
    const cookieStore = cookies();
    const storedState = cookieStore.get('threads_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      console.error('Invalid state parameter');
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }

    // Clear state cookie
    cookieStore.delete('threads_oauth_state');

    // Exchange code for access token
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // MUST use THREADS_APP_ID, not the main Meta App ID!
    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET; // Fallback to META_APP_SECRET
    
    const tokenParams = new URLSearchParams({
      client_id: appId!,
      client_secret: appSecret!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for token...');
    console.log('Token exchange parameters:', {
      client_id: appId?.substring(0, 5) + '...',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code: code.substring(0, 10) + '...'
    });
    
    // Use the official Threads Graph API token endpoint
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

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token received, getting user info...');

    // Exchange short-lived token for long-lived token
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId!,
      client_secret: appSecret!,
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

    // Try to get Threads user info directly first
    let meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${accessToken}`
    );
    
    // If Threads API fails, try Facebook Graph API
    if (!meResponse.ok) {
      console.log('Threads API failed, trying Facebook Graph API...');
      meResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
      );
    }
    
    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error('Failed to get user info:', errorText);
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.socialcal.app/dashboard/settings?error=threads_auth_failed'
        : 'http://localhost:3001/dashboard/settings?error=threads_auth_failed';
      return NextResponse.redirect(errorUrl);
    }
    
    const userData = await meResponse.json();
    console.log('User data:', userData);
    
    // Try to get Instagram Business/Creator accounts directly
    // First, check if the user has Instagram accounts linked
    let threadsUserId = null;
    let threadsUsername = null;
    let threadsProfilePic = null;
    let pageAccessToken = accessToken; // Default to user token
    
    // Try to get Instagram accounts through different methods
    console.log('Looking for Instagram Business/Creator accounts...');
    
    // Method 1: Try to get pages (some Instagram Creator accounts are treated as pages)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    
    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      console.log('Found pages/accounts:', pagesData.data?.length || 0);
      
      // Check each page for Instagram Business Account
      if (pagesData.data && pagesData.data.length > 0) {
        for (const page of pagesData.data) {
          console.log(`Checking account: ${page.name} (${page.id})`);
          
          // Check if this is an Instagram Business Account
          const igCheckResponse = await fetch(
            `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token || accessToken}`
          );
          
          if (igCheckResponse.ok) {
            const igCheckData = await igCheckResponse.json();
            
            if (igCheckData.instagram_business_account) {
              const igAccountId = igCheckData.instagram_business_account.id;
              console.log(`Found Instagram Business Account: ${igAccountId}`);
              
              // Get Instagram profile info
              const profileResponse = await fetch(
                `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username,profile_picture_url,biography,followers_count&access_token=${page.access_token || accessToken}`
              );
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                threadsUserId = igAccountId;
                threadsUsername = profileData.username;
                threadsProfilePic = profileData.profile_picture_url;
                pageAccessToken = page.access_token || accessToken;
                console.log(`Found Instagram account: @${threadsUsername}`);
                break;
              }
            }
          }
        }
      }
    }
    
    // Method 2: Try to get Instagram Business Account directly from user
    if (!threadsUserId) {
      console.log('Checking for Instagram Business Account linked to user directly...');
      const igBusinessResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=instagram_business_account&access_token=${accessToken}`
      );
      
      if (igBusinessResponse.ok) {
        const igBusinessData = await igBusinessResponse.json();
        
        if (igBusinessData.instagram_business_account) {
          const igAccountId = igBusinessData.instagram_business_account.id;
          console.log(`Found Instagram Business Account on user: ${igAccountId}`);
          
          // Get Instagram profile info
          const profileResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username,profile_picture_url,biography,followers_count&access_token=${accessToken}`
          );
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            threadsUserId = igAccountId;
            threadsUsername = profileData.username;
            threadsProfilePic = profileData.profile_picture_url;
            pageAccessToken = accessToken;
            console.log(`Found Instagram account: @${threadsUsername}`);
          }
        }
      }
    }
    
    // Method 3: Try Instagram Creator accounts (might be under different field)
    if (!threadsUserId) {
      console.log('Checking for Instagram Creator Account...');
      
      // Try with instagram_accounts field
      const igCreatorResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/instagram_accounts?access_token=${accessToken}`
      );
      
      if (igCreatorResponse.ok) {
        const igCreatorData = await igCreatorResponse.json();
        console.log('Instagram accounts response:', JSON.stringify(igCreatorData, null, 2));
        
        if (igCreatorData.data && igCreatorData.data.length > 0) {
          const igAccount = igCreatorData.data[0];
          const igAccountId = igAccount.id;
          console.log(`Found Instagram Creator Account: ${igAccountId}`);
          
          // Get Instagram profile info
          const profileResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username,profile_picture_url,biography,followers_count&access_token=${accessToken}`
          );
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            threadsUserId = igAccountId;
            threadsUsername = profileData.username || igAccount.username;
            threadsProfilePic = profileData.profile_picture_url;
            pageAccessToken = accessToken;
            console.log(`Found Instagram Creator account: @${threadsUsername}`);
          }
        }
      }
    }
    
    if (!threadsUserId) {
      console.error('No Instagram Business/Creator Account found');
      console.log('User needs to convert their Instagram account to Business/Creator type');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=threads_no_instagram_business', request.url)
      );
    }
    
    const threadsAccountData = {
      id: threadsUserId,
      username: threadsUsername,
      threads_profile_picture_url: threadsProfilePic,
      threads_biography: ''
    };
    
    console.log('Threads account data:', threadsAccountData);

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
      platform_user_id: threadsAccountData.id,
      account_name: threadsAccountData.username,
      username: threadsAccountData.username,
      profile_image_url: threadsAccountData.threads_profile_picture_url,
      access_token: pageAccessToken, // Use the appropriate access token for Threads API
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
    console.error('=== THREADS CALLBACK ERROR ===');
    console.error('Error details:', error);
    console.error('Request URL:', request.url);
    
    // Use the correct base URL for redirect
    const errorRedirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.socialcal.app/dashboard/settings?error=threads_callback_failed'
      : 'http://localhost:3001/dashboard/settings?error=threads_callback_failed';
    
    return NextResponse.redirect(errorRedirectUrl);
  }
}
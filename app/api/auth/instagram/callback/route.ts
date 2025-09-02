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

    // Instagram OAuth token exchange (Instagram app, not Facebook!)
    const instagramAppId = process.env.INSTAGRAM_CLIENT_ID || '1322876636131547';
    const instagramAppSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET; // May need separate secret
    
    // Build token body manually to ensure exact encoding
    const tokenBody = new URLSearchParams();
    tokenBody.append('client_id', instagramAppId);
    tokenBody.append('client_secret', instagramAppSecret!);
    tokenBody.append('grant_type', 'authorization_code');
    tokenBody.append('redirect_uri', redirectUri);
    tokenBody.append('code', code);

    console.log('=== Instagram Token Exchange ===');
    console.log('Client ID:', instagramAppId);
    console.log('Client Secret (first 4 chars):', instagramAppSecret?.substring(0, 4) + '...');
    console.log('Redirect URI (exact):', redirectUri);
    console.log('Code (first 20 chars):', code.substring(0, 20) + '...');
    console.log('Code length:', code.length);
    
    // Log each parameter separately for debugging
    console.log('Token body parameters:');
    tokenBody.forEach((value, key) => {
      if (key === 'client_secret') {
        console.log(`  ${key}: ${value.substring(0, 4)}...`);
      } else if (key === 'code') {
        console.log(`  ${key}: ${value.substring(0, 20)}...`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    // Try Instagram's token endpoint with POST body
    const tokenUrl = 'https://api.instagram.com/oauth/access_token';
    console.log('Token URL:', tokenUrl);
    console.log('Full request body:', tokenBody.toString().replace(instagramAppSecret!, 'SECRET').replace(code, 'CODE'));
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody.toString()
    });

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

    // Instagram OAuth response includes: access_token, user_id
    const { access_token, user_id } = tokenData;

    if (!access_token || !user_id) {
      console.error('Missing required fields in token response');
      console.error('access_token:', access_token ? 'present' : 'missing');
      console.error('user_id:', user_id ? 'present' : 'missing');
      console.error('Full response:', tokenData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    // Get Instagram Business account info
    console.log('Instagram Business account authenticated');
    console.log('User ID:', user_id);
    console.log('Permissions granted:', tokenData.permissions);
    
    // Instagram Business Login tokens need special handling
    // Try multiple endpoints to get the username
    let profileData = null;
    
    // Try 1: Instagram Graph API with user_id
    const instagramGraphUrl = `https://graph.instagram.com/${user_id}?fields=username,name,account_type,media_count&access_token=${access_token}`;
    console.log('Trying Instagram Graph API with user_id...');
    
    let profileResponse = await fetch(instagramGraphUrl);
    console.log('Instagram Graph response:', profileResponse.status);
    
    if (profileResponse.ok) {
      profileData = await profileResponse.json();
      console.log('Got profile from Instagram Graph:', JSON.stringify(profileData, null, 2));
    } else {
      const error1 = await profileResponse.text();
      console.log('Instagram Graph failed:', error1);
      console.log('Trying /me endpoint...');
      
      // Try 2: Instagram Graph API /me endpoint
      const meUrl = `https://graph.instagram.com/me?fields=username,account_type&access_token=${access_token}`;
      profileResponse = await fetch(meUrl);
      console.log('/me endpoint response:', profileResponse.status);
      
      if (profileResponse.ok) {
        profileData = await profileResponse.json();
        console.log('Got profile from /me:', JSON.stringify(profileData, null, 2));
      } else {
        const error2 = await profileResponse.text();
        console.log('/me endpoint failed:', error2);
      }
    }
    
    // If all API calls failed, use fallback
    if (!profileData) {
      console.warn('All profile fetches failed, using fallback');
      profileData = {
        id: user_id,
        username: `instagram_${user_id}`,
        profile_picture_url: null
      };
    }
    
    // Ensure we have a username
    if (!profileData.username) {
      console.warn('No username in profile data, adding fallback username');
      profileData.username = `instagram_${user_id}`;
    }
    
    console.log('Final profile data:', {
      id: profileData.id || user_id,
      username: profileData.username
    });

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
      platform_user_id: user_id, // Instagram user ID from token response
      account_name: profileData.username || `instagram_${user_id}`,
      username: profileData.username || `instagram_${user_id}`,
      profile_image_url: profileData.profile_picture_url || null,
      access_token: access_token, // Instagram access token (no Facebook page needed!)
      access_secret: '', // Not used for Instagram
      is_active: true,
    };
    
    console.log('Storing Instagram account data:', {
      ...accountData,
      access_token: 'REDACTED'
    });

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
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
    console.log('Redirect URI:', redirectUri);
    console.log('Code length:', code.length);
    console.log('Has secret:', !!instagramAppSecret);
    
    // Try Instagram's token endpoint with POST body
    const tokenUrl = 'https://api.instagram.com/oauth/access_token';
    console.log('Token URL:', tokenUrl);
    console.log('Request body:', tokenBody.toString());
    
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

    // Get Instagram Business account info directly (no Facebook pages needed!)
    console.log('Fetching Instagram Business account info...');
    console.log('User ID:', user_id);
    console.log('Access token length:', access_token.length);
    
    const profileUrl = `https://graph.instagram.com/v20.0/${user_id}?fields=id,username,account_type,media_count,followers_count,follows_count,profile_picture_url,name&access_token=${access_token}`;
    console.log('Profile URL:', profileUrl.replace(access_token, 'REDACTED'));
    
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
      platform_user_id: user_id, // Instagram user ID from token response
      account_name: profileData.username,
      username: profileData.username,
      profile_image_url: profileData.profile_picture_url,
      access_token: access_token, // Instagram access token (no Facebook page needed!)
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
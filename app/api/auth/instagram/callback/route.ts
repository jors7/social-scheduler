import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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
    const { access_token: shortLivedToken, user_id } = tokenData;

    if (!shortLivedToken || !user_id) {
      console.error('Missing required fields in token response');
      console.error('access_token:', shortLivedToken ? 'present' : 'missing');
      console.error('user_id:', user_id ? 'present' : 'missing');
      console.error('Full response:', tokenData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=instagram_auth_failed', request.url)
      );
    }

    // Exchange short-lived token for long-lived token
    console.log('=== Exchanging for Long-Lived Token ===');
    console.log('Short-lived token (first 20 chars):', shortLivedToken.substring(0, 20) + '...');
    
    const exchangeUrl = new URL('https://graph.instagram.com/access_token');
    exchangeUrl.searchParams.append('grant_type', 'ig_exchange_token');
    exchangeUrl.searchParams.append('client_secret', instagramAppSecret!);
    exchangeUrl.searchParams.append('access_token', shortLivedToken);
    
    console.log('Exchange URL (without secrets):', exchangeUrl.toString().replace(instagramAppSecret!, 'SECRET').replace(shortLivedToken, 'TOKEN'));
    
    const exchangeResponse = await fetch(exchangeUrl.toString());
    
    console.log('Exchange response status:', exchangeResponse.status);
    
    let access_token = shortLivedToken; // Fallback to short-lived token if exchange fails
    let token_type = 'short_lived';
    
    if (exchangeResponse.ok) {
      const exchangeData = await exchangeResponse.json();
      console.log('Exchange response:', JSON.stringify(exchangeData, null, 2));
      
      if (exchangeData.access_token) {
        access_token = exchangeData.access_token;
        token_type = 'long_lived';
        console.log('Successfully obtained long-lived token');
        console.log('Token expires in:', exchangeData.expires_in, 'seconds');
      }
    } else {
      const errorText = await exchangeResponse.text();
      console.error('Token exchange failed:', errorText);
      console.warn('Continuing with short-lived token');
    }

    // Get Instagram Business account info
    console.log('Instagram Business account authenticated');
    console.log('User ID:', user_id);
    console.log('Token type:', token_type);
    console.log('Permissions granted:', tokenData.permissions);
    
    // Now we need to get the Instagram Business Account ID
    // The user_id from OAuth might be different from the IG Business Account ID
    let profileData = null;
    let igBusinessAccountId = user_id; // Default to OAuth user_id
    let facebookPageAccessToken = null; // Store FB Page token for location search

    // ALWAYS fetch Facebook Pages to get Page access token (required for location search)
    // This must happen regardless of whether Instagram token is short-lived or long-lived
    console.log('[Instagram Callback] Fetching Facebook Pages with Instagram Business Accounts...');
    console.log('[Instagram Callback] Token type:', token_type);
    console.log('[Instagram Callback] Access token available:', !!access_token);

    const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account,name,access_token&access_token=${access_token}`;
    const pagesResponse = await fetch(pagesUrl);
    console.log('[Instagram Callback] Pages response status:', pagesResponse.status);

    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      console.log('[Instagram Callback] Pages fetched:', pagesData.data?.length || 0, 'pages');

      // Find the first page with an Instagram Business Account
      const pageWithInstagram = pagesData.data?.find((page: any) => page.instagram_business_account);

      if (pageWithInstagram) {
        console.log('[Instagram Callback] Found page with Instagram account:', pageWithInstagram.name);

        // ALWAYS capture Facebook Page access token (needed for location search)
        if (pageWithInstagram.access_token) {
          facebookPageAccessToken = pageWithInstagram.access_token;
          console.log('[Instagram Callback] ✓ Facebook Page token captured successfully');
        } else {
          console.error('[Instagram Callback] ✗ Page found but no access_token in response');
        }

        // Only update igBusinessAccountId if we have a long-lived token
        if (token_type === 'long_lived' && pageWithInstagram.instagram_business_account?.id) {
          igBusinessAccountId = pageWithInstagram.instagram_business_account.id;
          console.log('[Instagram Callback] Found Instagram Business Account ID:', igBusinessAccountId);
        }
      } else {
        console.error('[Instagram Callback] ✗ No page with Instagram Business Account found');
      }
    } else {
      const errorText = await pagesResponse.text();
      console.error('[Instagram Callback] ✗ Failed to fetch Facebook Pages:', errorText);
    }

    if (!facebookPageAccessToken) {
      console.error('[Instagram Callback] ✗ Facebook Page token NOT captured - location search will fail');
      console.error('[Instagram Callback] This usually means: missing OAuth scopes, no admin access to page, or API error');
    }
    
    // Try 1: Instagram Graph API with the Business Account ID
    const instagramGraphUrl = `https://graph.instagram.com/${igBusinessAccountId}?fields=username,name,account_type,media_count&access_token=${access_token}`;
    console.log('Trying Instagram Graph API with ID:', igBusinessAccountId);
    
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
        id: igBusinessAccountId,
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
      id: profileData.id || igBusinessAccountId,
      username: profileData.username,
      token_type: token_type
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

    // IMPORTANT: Use profile ID from /me endpoint, NOT token user_id
    // The profile ID is the actual Instagram account ID that works with the API
    // The token user_id may differ and cause 500 errors
    const platformUserId = (profileData.id || user_id).toString();
    const accountName = profileData.username || `instagram_${user_id}`;
    const username = profileData.username || `instagram_${user_id}`;
    const profileImageUrl = profileData.profile_picture_url || null;

    console.log('Storing Instagram account data:', {
      user_id: user.id,
      platform: 'instagram',
      platform_user_id: platformUserId,
      username: username,
      access_token: 'REDACTED',
      token_user_id: user_id,
      profile_user_id: profileData.id
    });
    
    // Use service role client for database operations to bypass RLS
    console.log('[Instagram Callback] Creating service role client...');
    console.log('[Instagram Callback] SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[Instagram Callback] SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('[Instagram Callback] SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('[Instagram Callback] Service role client created successfully');

    // Check if this specific account (by platform_user_id) already exists
    const { data: existingAccount, error: fetchError } = await supabaseAdmin
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('platform_user_id', platformUserId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing Instagram account:', fetchError);
    }

    console.log('[Instagram Callback] Existing account found:', existingAccount ? 'YES' : 'NO');

    if (existingAccount) {
      // Update existing account and reactivate it
      console.log('[Instagram Callback] Updating existing account:', existingAccount.id);
      const { data: updateData, error: dbError, count } = await supabaseAdmin
        .from('social_accounts')
        .update({
          platform_user_id: platformUserId,
          username: username,
          access_token: access_token, // Long-lived Instagram token
          access_secret: facebookPageAccessToken, // Facebook Page token for Graph API calls
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id)
        .select();

      console.log('[Instagram Callback] Update result:', {
        error: dbError,
        rowsAffected: updateData?.length || 0,
        data: updateData
      });

      if (dbError) {
        console.error('[Instagram Callback] Database update error:', dbError);
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=database_error', request.url)
        );
      }

      if (!updateData || updateData.length === 0) {
        console.error('[Instagram Callback] UPDATE returned 0 rows - RLS may be blocking!');
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=update_failed', request.url)
        );
      }

      console.log('[Instagram Callback] Account updated successfully');
    } else {
      // Insert new account
      console.log('[Instagram Callback] Inserting new account for platform_user_id:', platformUserId);
      const { error: dbError } = await supabaseAdmin
        .from('social_accounts')
        .insert({
          user_id: user.id,
          platform: 'instagram',
          platform_user_id: platformUserId,
          username: username,
          access_token: access_token, // Long-lived Instagram token
          access_secret: facebookPageAccessToken, // Facebook Page token for Graph API calls
          is_active: true
        });

      if (dbError) {
        console.error('[Instagram Callback] Database insert error:', dbError);
        console.error('[Instagram Callback] Insert failed for user_id:', user.id, 'platform_user_id:', platformUserId);
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=database_error', request.url)
        );
      }
      console.log('[Instagram Callback] Account inserted successfully');
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
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface FacebookUserResponse {
  id: string;
  name: string;
  email?: string;
}

interface FacebookPageResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    category?: string;
    tasks?: string[];
  }>;
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('=== Facebook OAuth Callback ===');
    console.log('Has code:', !!code);
    console.log('State:', state);
    console.log('Error:', error);

    // Handle OAuth errors
    if (error) {
      console.error('Facebook OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=facebook_auth_failed&details=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=facebook_auth_failed', request.url)
      );
    }

    // Verify state for CSRF protection
    const cookieStore = cookies();
    const storedState = cookieStore.get('facebook_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      console.error('State mismatch - possible CSRF attack');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=facebook_auth_failed', request.url)
      );
    }

    // Clear the state cookie
    cookieStore.delete('facebook_oauth_state');

    // Determine callback URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!);
    tokenUrl.searchParams.append('client_secret', process.env.FACEBOOK_APP_SECRET!);
    tokenUrl.searchParams.append('code', code);
    tokenUrl.searchParams.append('redirect_uri', redirectUri);

    console.log('Exchanging code for token...');
    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData: FacebookTokenResponse = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Failed to get access token:', tokenData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=facebook_token_failed', request.url)
      );
    }

    console.log('Access token obtained successfully');

    // Exchange short-lived token for long-lived token (60+ days)
    const longLivedTokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedTokenUrl.searchParams.append('grant_type', 'fb_exchange_token');
    longLivedTokenUrl.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!);
    longLivedTokenUrl.searchParams.append('client_secret', process.env.FACEBOOK_APP_SECRET!);
    longLivedTokenUrl.searchParams.append('fb_exchange_token', tokenData.access_token);

    console.log('Exchanging for long-lived token...');
    const longLivedResponse = await fetch(longLivedTokenUrl.toString());
    const longLivedData: FacebookTokenResponse = await longLivedResponse.json();

    const finalAccessToken = longLivedData.access_token || tokenData.access_token;
    console.log('Using token type:', longLivedData.access_token ? 'long-lived' : 'short-lived');

    // Get user info
    const userUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${finalAccessToken}`;
    const userResponse = await fetch(userUrl);
    const userData: FacebookUserResponse = await userResponse.json();

    if (!userResponse.ok || !userData.id) {
      console.error('Failed to get user info:', userData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=facebook_user_failed', request.url)
      );
    }

    console.log('Facebook user info:', {
      id: userData.id,
      name: userData.name,
      hasEmail: !!userData.email
    });

    // Get user's Facebook Pages
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category,tasks&access_token=${finalAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData: FacebookPageResponse = await pagesResponse.json();

    if (!pagesResponse.ok) {
      console.error('Failed to get pages:', pagesData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=facebook_pages_failed', request.url)
      );
    }

    console.log(`Found ${pagesData.data?.length || 0} Facebook pages`);

    // Check if user has any pages
    if (!pagesData.data || pagesData.data.length === 0) {
      console.error('No Facebook pages found for user');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=facebook_no_pages', request.url)
      );
    }

    // Get the session user ID from the cookie
    const sessionToken = cookieStore.get('sb-access-token')?.value || 
                        cookieStore.get('sb-eppohzalybrjcizqeleu-auth-token')?.value;
    
    if (!sessionToken) {
      console.error('No session token found');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=not_authenticated', request.url)
      );
    }

    // Parse the session token to get user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser(sessionToken);
    
    if (userError || !user) {
      console.error('Failed to get authenticated user:', userError);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=not_authenticated', request.url)
      );
    }

    console.log('Authenticated user ID:', user.id);

    // Store each page as a separate social account
    const accountPromises = pagesData.data.map(async (page, index) => {
      // Exchange page access token for long-lived page access token
      const pageLongLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
      pageLongLivedUrl.searchParams.append('grant_type', 'fb_exchange_token');
      pageLongLivedUrl.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!);
      pageLongLivedUrl.searchParams.append('client_secret', process.env.FACEBOOK_APP_SECRET!);
      pageLongLivedUrl.searchParams.append('fb_exchange_token', page.access_token);

      const pageLongLivedResponse = await fetch(pageLongLivedUrl.toString());
      const pageLongLivedData: FacebookTokenResponse = await pageLongLivedResponse.json();

      const finalPageToken = pageLongLivedData.access_token || page.access_token;

      // Check if this page already exists
      const { data: existingAccount } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'facebook')
        .eq('platform_user_id', page.id)
        .single();

      if (existingAccount) {
        // Update existing account
        const { error: updateError } = await supabase
          .from('social_accounts')
          .update({
            username: page.name,
            access_token: finalPageToken,
            access_secret: finalAccessToken, // Store user token as backup
            account_label: page.name,
            metadata: {
              category: page.category,
              tasks: page.tasks,
              user_id: userData.id,
              user_name: userData.name,
              token_expires_in: longLivedData.expires_in || tokenData.expires_in
            },
            expires_at: longLivedData.expires_in 
              ? new Date(Date.now() + (longLivedData.expires_in * 1000)).toISOString()
              : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAccount.id);

        if (updateError) {
          console.error(`Error updating Facebook page ${page.name}:`, updateError);
        } else {
          console.log(`Updated Facebook page: ${page.name}`);
        }
      } else {
        // Insert new account
        const { error: insertError } = await supabase
          .from('social_accounts')
          .insert({
            user_id: user.id,
            platform: 'facebook',
            platform_user_id: page.id,
            username: page.name,
            access_token: finalPageToken,
            access_secret: finalAccessToken, // Store user token as backup
            account_label: page.name,
            is_active: true,
            is_primary: index === 0, // First page is primary
            metadata: {
              category: page.category,
              tasks: page.tasks,
              user_id: userData.id,
              user_name: userData.name,
              token_expires_in: longLivedData.expires_in || tokenData.expires_in
            },
            expires_at: longLivedData.expires_in 
              ? new Date(Date.now() + (longLivedData.expires_in * 1000)).toISOString()
              : null
          });

        if (insertError) {
          console.error(`Error storing Facebook page ${page.name}:`, insertError);
        } else {
          console.log(`Stored Facebook page: ${page.name}`);
        }
      }
    });

    await Promise.all(accountPromises);

    console.log('Facebook pages successfully connected');
    return NextResponse.redirect(
      new URL('/dashboard/settings?success=facebook_connected', request.url)
    );

  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=facebook_callback_failed', request.url)
    );
  }
}
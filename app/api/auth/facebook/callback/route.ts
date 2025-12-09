import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { checkAccountLimits } from '@/lib/subscription/account-limits';

export const dynamic = 'force-dynamic';

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
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
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
    const longLivedTokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
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
    const userUrl = `https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${finalAccessToken}`;
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
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,tasks&access_token=${finalAccessToken}`;
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

    // Create a Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {
            // Not needed for this route
          },
          remove() {
            // Not needed for this route
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Failed to get authenticated user:', userError);
      console.error('Available cookies:', Array.from(cookieStore.getAll()).map(c => c.name).join(', '));
      
      // Try alternative approach with service role to store the account
      // We'll store it with a temporary flag and require re-authentication
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=not_authenticated', request.url)
      );
    }

    console.log('Authenticated user ID:', user.id);

    // Create service role client for database operations
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Check account limits before connecting new accounts
    const accountLimits = await checkAccountLimits(user.id, supabaseAdmin);
    const newPagesCount = pagesData.data.length;

    // Count how many of these pages are already connected (updates don't count against limit)
    const { data: existingAccounts } = await supabaseAdmin
      .from('social_accounts')
      .select('platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'facebook');

    const existingPageIds = new Set(existingAccounts?.map(a => a.platform_user_id) || []);
    const trulyNewPages = pagesData.data.filter(page => !existingPageIds.has(page.id));

    if (trulyNewPages.length > 0 && !accountLimits.canAddMore) {
      console.error('Account limit reached:', accountLimits);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=account_limit_reached&details=${encodeURIComponent(`You can connect up to ${accountLimits.maxAccounts} accounts on your current plan. You have ${accountLimits.currentCount} connected.`)}`, request.url)
      );
    }

    // Check if adding all new pages would exceed the limit
    if (trulyNewPages.length > accountLimits.remainingSlots && accountLimits.remainingSlots !== Infinity) {
      console.error('Would exceed account limit:', { newPages: trulyNewPages.length, remainingSlots: accountLimits.remainingSlots });
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=account_limit_reached&details=${encodeURIComponent(`Adding ${trulyNewPages.length} new pages would exceed your limit. You can add ${accountLimits.remainingSlots} more account(s) on your current plan.`)}`, request.url)
      );
    }

    // Store each page as a separate social account
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    const accountPromises = pagesData.data.map(async (page, index) => {
      try {
        console.log(`Processing page ${index + 1}/${pagesData.data.length}: ${page.name} (ID: ${page.id})`);
        
        // Exchange page access token for long-lived page access token
        const pageLongLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
        pageLongLivedUrl.searchParams.append('grant_type', 'fb_exchange_token');
        pageLongLivedUrl.searchParams.append('client_id', process.env.FACEBOOK_APP_ID!);
        pageLongLivedUrl.searchParams.append('client_secret', process.env.FACEBOOK_APP_SECRET!);
        pageLongLivedUrl.searchParams.append('fb_exchange_token', page.access_token);

        const pageLongLivedResponse = await fetch(pageLongLivedUrl.toString());
        const pageLongLivedData: FacebookTokenResponse = await pageLongLivedResponse.json();

        const finalPageToken = pageLongLivedData.access_token || page.access_token;
        console.log(`Got ${pageLongLivedData.access_token ? 'long-lived' : 'standard'} token for page ${page.name}`);

      // Check if this page already exists
      const { data: existingAccount } = await supabaseAdmin
        .from('social_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'facebook')
        .eq('platform_user_id', page.id)
        .single();

      if (existingAccount) {
        // Update existing account
        const { error: updateError } = await supabaseAdmin
          .from('social_accounts')
          .update({
            username: page.name,
            access_token: finalPageToken,
            access_secret: finalAccessToken, // Store user token as backup
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
        // Insert new account - using the actual column names from the database
        const { error: insertError } = await supabaseAdmin
          .from('social_accounts')
          .insert({
            user_id: user.id,
            platform: 'facebook',
            platform_user_id: page.id,
            username: page.name,
            access_token: finalPageToken,
            access_secret: finalAccessToken, // Store user token as backup
            is_active: true,
            expires_at: longLivedData.expires_in 
              ? new Date(Date.now() + (longLivedData.expires_in * 1000)).toISOString()
              : null
          });

        if (insertError) {
          console.error(`Error storing Facebook page ${page.name}:`, insertError);
          console.error('Insert error details:', JSON.stringify(insertError, null, 2));
          errorCount++;
          errors.push(`${page.name}: ${insertError.message || 'Unknown error'}`);
        } else {
          console.log(`Stored Facebook page: ${page.name}`);
          successCount++;
          
          // Verify the insert worked
          const { data: verifyData, error: verifyError } = await supabaseAdmin
            .from('social_accounts')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', 'facebook')
            .eq('platform_user_id', page.id)
            .single();
            
          if (verifyError) {
            console.error('Failed to verify Facebook page storage:', verifyError);
          } else {
            console.log('Verified Facebook page in database:', verifyData);
          }
        }
      }
      } catch (pageError) {
        console.error(`Failed to process page ${page.name}:`, pageError);
        errorCount++;
        errors.push(`${page.name}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
      }
    });

    await Promise.all(accountPromises);

    console.log(`Facebook pages processing complete. Success: ${successCount}, Errors: ${errorCount}`);
    
    if (errorCount > 0) {
      console.error('Errors encountered:', errors);
      
      // If all failed, redirect with error
      if (successCount === 0) {
        return NextResponse.redirect(
          new URL(`/dashboard/settings?error=facebook_storage_failed&details=${encodeURIComponent(errors.join(', '))}`, request.url)
        );
      }
    }

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
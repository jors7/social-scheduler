import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { canConnectNewAccount } from '@/lib/subscription/account-limits';

export const dynamic = 'force-dynamic';

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
// Updated API endpoints for OpenID Connect
const LINKEDIN_PROFILE_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_EMAIL_URL = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';

export async function GET(request: NextRequest) {
  console.log('LinkedIn callback route hit');
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('LinkedIn callback params:', { code: code?.substring(0, 10) + '...', state, error, errorDescription });

    // Check for OAuth errors
    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=linkedin_auth_failed&message=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code || !state) {
      console.error('Missing code or state in LinkedIn callback');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=linkedin_auth_failed', request.url)
      );
    }

    // Verify state to prevent CSRF
    const cookieStore = cookies();
    const storedState = cookieStore.get('linkedin_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      console.error('LinkedIn OAuth state mismatch', { storedState, state });
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=linkedin_auth_failed&message=Invalid+state', request.url)
      );
    }

    // Determine the base URL
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL;

    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${baseUrl}/api/auth/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });

    console.log('Exchanging code for token with params:', {
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: `${baseUrl}/api/auth/linkedin/callback`,
      code_length: code.length,
    });

    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('LinkedIn token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
        params: {
          client_id: process.env.LINKEDIN_CLIENT_ID,
          redirect_uri: `${baseUrl}/api/auth/linkedin/callback`,
        }
      });
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=linkedin_token_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // LinkedIn tokens expire in 60 days

    // Get user profile
    const profileResponse = await fetch(LINKEDIN_PROFILE_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch LinkedIn profile');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=linkedin_profile_failed', request.url)
      );
    }

    const profileData = await profileResponse.json();
    console.log('LinkedIn profile data:', profileData);

    // OpenID Connect returns email directly in userinfo
    const email = profileData.email || null;

    // Save to database
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

    // Construct display name from LinkedIn profile (OpenID Connect format)
    const displayName = profileData.name || profileData.given_name && profileData.family_name 
      ? `${profileData.given_name} ${profileData.family_name}`.trim() 
      : 'LinkedIn User';

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const platformUserId = profileData.sub || profileData.id;

    // Check if this specific LinkedIn account already exists
    const { data: existingAccount } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'linkedin')
      .eq('platform_user_id', platformUserId)
      .maybeSingle();

    if (existingAccount) {
      // Update existing account
      const { error: updateError } = await supabase
        .from('social_accounts')
        .update({
          access_token: accessToken,
          platform_user_id: platformUserId,
          username: displayName,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id);

      if (updateError) {
        console.error('Error updating LinkedIn account:', updateError);
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=linkedin_save_failed', request.url)
        );
      }
    } else {
      // Check account limits before creating new account
      const canConnect = await canConnectNewAccount(user.id, supabase);
      if (!canConnect) {
        console.error('Account limit reached for user:', user.id);
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=account_limit_reached&details=' + encodeURIComponent('You have reached your account connection limit. Please upgrade your plan to connect more accounts.'), request.url)
        );
      }

      // Create new account
      const { error: insertError } = await supabase
        .from('social_accounts')
        .insert({
          user_id: user.id,
          platform: 'linkedin',
          access_token: accessToken,
          platform_user_id: platformUserId,
          username: displayName,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        });

      if (insertError) {
        console.error('Error saving LinkedIn account:', insertError);
        return NextResponse.redirect(
          new URL('/dashboard/settings?error=linkedin_save_failed', request.url)
        );
      }
    }

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/dashboard/settings?success=linkedin_connected', request.url)
    );

  } catch (error: any) {
    console.error('LinkedIn callback error:', {
      error: error.message || error,
      stack: error.stack,
      url: request.url,
    });
    
    // Try to provide more specific error message
    const errorMessage = error.message?.includes('fetch') 
      ? 'Network error connecting to LinkedIn'
      : error.message || 'Unknown error occurred';
    
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=linkedin_callback_failed&message=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
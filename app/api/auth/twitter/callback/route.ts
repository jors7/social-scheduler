import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { TwitterService } from '@/lib/twitter/service';
import { canConnectNewAccount } from '@/lib/subscription/account-limits';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    const searchParams = request.nextUrl.searchParams;
    
    // Get OAuth verifier from callback
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    
    if (!oauthToken || !oauthVerifier) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=twitter_auth_failed`
      );
    }

    // Get stored OAuth tokens
    const storedToken = cookieStore.get('twitter_oauth_token')?.value;
    const storedTokenSecret = cookieStore.get('twitter_oauth_token_secret')?.value;

    if (!storedToken || !storedTokenSecret || storedToken !== oauthToken) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=twitter_session_expired`
      );
    }

    // Create client with temporary credentials
    const tempClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: storedToken,
      accessSecret: storedTokenSecret,
    });

    // Exchange for permanent credentials
    const { accessToken, accessSecret } = await tempClient.login(oauthVerifier);

    // Verify credentials and get user info
    const twitterService = new TwitterService({ accessToken, accessSecret });
    const twitterUser = await twitterService.verifyCredentials();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=unauthorized`
      );
    }

    // Store Twitter credentials in database
    const platformUserId = twitterUser.id;
    const accountName = twitterUser.name;
    const username = twitterUser.username;
    const profileImageUrl = twitterUser.profile_image_url;
    
    // Check if this specific Twitter account already exists
    const { data: existingAccount } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'twitter')
      .eq('platform_user_id', platformUserId)
      .maybeSingle();

    if (existingAccount) {
      // Update existing account
      const { error: dbError } = await supabase
        .from('social_accounts')
        .update({
          platform_user_id: platformUserId,
          account_name: accountName,
          username: username,
          profile_image_url: profileImageUrl,
          access_token: accessToken,
          access_secret: accessSecret,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);
        
      if (dbError) {
        console.error('Database update error:', dbError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=database_error`
        );
      }
    } else {
      // Check account limits before creating new account
      const canConnect = await canConnectNewAccount(user.id, supabase);
      if (!canConnect) {
        console.error('Account limit reached for user:', user.id);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=account_limit_reached&details=${encodeURIComponent('You have reached your account connection limit. Please upgrade your plan to connect more accounts.')}`
        );
      }

      // Insert new account
      const { error: dbError } = await supabase
        .from('social_accounts')
        .insert({
          user_id: user.id,
          platform: 'twitter',
          platform_user_id: platformUserId,
          account_name: accountName,
          username: username,
          profile_image_url: profileImageUrl,
          access_token: accessToken,
          access_secret: accessSecret,
          is_active: true
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=database_error`
        );
      }
    }

    // Clear OAuth cookies
    cookieStore.delete('twitter_oauth_token');
    cookieStore.delete('twitter_oauth_token_secret');

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=twitter_connected`
    );
  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=twitter_callback_failed`
    );
  }
}
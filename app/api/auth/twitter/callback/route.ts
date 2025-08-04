import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TwitterService } from '@/lib/twitter/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
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
    const cookieStore = cookies();
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
    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert({
        user_id: user.id,
        platform: 'twitter',
        account_id: twitterUser.id,
        account_name: twitterUser.name,
        account_username: twitterUser.username,
        profile_image_url: twitterUser.profile_image_url,
        access_token: accessToken,
        access_secret: accessSecret,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=database_error`
      );
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
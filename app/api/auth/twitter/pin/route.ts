import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { TwitterService } from '@/lib/twitter/service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Twitter PIN Verification ===');
    
    const { pin } = await request.json();
    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    console.log('PIN received:', pin);

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

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stored OAuth tokens
    const storedToken = cookieStore.get('twitter_oauth_token')?.value;
    const storedTokenSecret = cookieStore.get('twitter_oauth_token_secret')?.value;

    if (!storedToken || !storedTokenSecret) {
      return NextResponse.json({ 
        error: 'OAuth session expired. Please try connecting again.' 
      }, { status: 400 });
    }

    console.log('OAuth tokens found, creating client...');

    // Create client with temporary credentials
    const tempClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: storedToken,
      accessSecret: storedTokenSecret,
    });

    console.log('Logging in with PIN...');
    // Exchange PIN for permanent credentials
    const { accessToken, accessSecret } = await tempClient.login(pin);

    console.log('PIN login successful, verifying credentials...');
    // Verify credentials and get user info
    const twitterService = new TwitterService({ accessToken, accessSecret });
    const twitterUser = await twitterService.verifyCredentials();

    console.log('Twitter user verified:', twitterUser.username);

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
      return NextResponse.json({ error: 'Failed to save account' }, { status: 500 });
    }

    // Clear OAuth cookies
    cookieStore.delete('twitter_oauth_token');
    cookieStore.delete('twitter_oauth_token_secret');

    console.log('Twitter account connected successfully');
    return NextResponse.json({ success: true, user: twitterUser });

  } catch (error) {
    console.error('Twitter PIN verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify PIN', details: (error as Error).message },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { TwitterService } from '@/lib/twitter/service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Twitter PIN Verification ===');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { pin } = body;
    if (!pin) {
      console.log('No PIN provided');
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
    console.log('Using stored tokens:', { 
      token: storedToken?.substring(0, 10) + '...', 
      secret: storedTokenSecret?.substring(0, 10) + '...' 
    });

    // Verify environment variables
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
      console.error('Missing Twitter API credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    console.log('Creating Twitter client with credentials...');
    // Create client with temporary credentials
    const tempClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: storedToken,
      accessSecret: storedTokenSecret,
    });

    console.log('Logging in with PIN:', pin);
    // Exchange PIN for permanent credentials
    let accessToken: string;
    let accessSecret: string;
    
    try {
      const loginResult = await tempClient.login(pin);
      console.log('Login successful, result keys:', Object.keys(loginResult));
      
      accessToken = loginResult.accessToken;
      accessSecret = loginResult.accessSecret;
      
      if (!accessToken || !accessSecret) {
        console.error('Missing tokens in login result:', loginResult);
        return NextResponse.json({ 
          error: 'Invalid response from Twitter. Please try again.' 
        }, { status: 400 });
      }
      
      console.log('Got permanent tokens:', { 
        accessToken: accessToken.substring(0, 10) + '...', 
        accessSecret: accessSecret.substring(0, 10) + '...' 
      });
    } catch (loginError: any) {
      console.error('Twitter login error:', loginError);
      if (loginError.code === 401) {
        return NextResponse.json({ 
          error: 'Invalid PIN or expired session. Please try connecting again.' 
        }, { status: 400 });
      }
      return NextResponse.json({ 
        error: 'Failed to verify PIN with Twitter' 
      }, { status: 500 });
    }

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
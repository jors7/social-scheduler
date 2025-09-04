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
    console.log('Preparing to save Twitter account...');
    
    try {
      const platformUserId = twitterUser.id;
      const accountName = twitterUser.name;
      const username = twitterUser.username;
      const profileImageUrl = twitterUser.profile_image_url;
      
      console.log('Account data to save:', { 
        user_id: user.id,
        platform: 'twitter',
        platform_user_id: platformUserId,
        username: username,
        access_token: 'hidden', 
        access_secret: 'hidden' 
      });
      
      // Check if this account already exists
      const { data: existingAccount } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'twitter')
        .single();

      let data;
      if (existingAccount) {
        // Update existing account
        const { data: updateData, error: dbError } = await supabase
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
          .eq('id', existingAccount.id)
          .select();
          
        if (dbError) {
          console.error('Database update error:', dbError);
          return NextResponse.json({ 
            error: 'Database error', 
            details: dbError.message,
            code: dbError.code
          }, { status: 500 });
        }
        data = updateData;
      } else {
        // Insert new account
        const { data: insertData, error: dbError } = await supabase
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
          })
          .select();
          
        if (dbError) {
          console.error('Database insert error:', dbError);
          return NextResponse.json({ 
            error: 'Database error', 
            details: dbError.message,
            code: dbError.code
          }, { status: 500 });
        }
        data = insertData;
      }

      console.log('Account saved successfully:', data);
    } catch (saveError: any) {
      console.error('Unexpected error saving account:', saveError);
      return NextResponse.json({ 
        error: 'Unexpected error', 
        details: saveError.message 
      }, { status: 500 });
    }

    // Clear OAuth cookies
    cookieStore.delete('twitter_oauth_token');
    cookieStore.delete('twitter_oauth_token_secret');

    console.log('Twitter account connected successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Twitter account connected successfully',
      user: {
        id: twitterUser.id,
        name: twitterUser.name,  
        username: twitterUser.username
      }
    });

  } catch (error) {
    console.error('Twitter PIN verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify PIN', details: (error as Error).message },
      { status: 500 }
    );
  }
}
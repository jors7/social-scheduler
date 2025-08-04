import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { BlueskyClient } from '@/lib/bluesky/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Bluesky Authentication ===');
    
    const body = await request.json();
    const { identifier, password } = body;
    
    if (!identifier || !password) {
      return NextResponse.json({ 
        error: 'Both identifier (handle) and password are required' 
      }, { status: 400 });
    }

    console.log('Attempting Bluesky login for:', identifier);

    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated, verifying Bluesky credentials...');

    // Verify Bluesky credentials
    const blueskyClient = new BlueskyClient();
    const blueskyProfile = await blueskyClient.verifyCredentials({
      identifier,
      password,
    });

    console.log('Bluesky credentials verified for:', blueskyProfile.handle);

    // Store Bluesky credentials in database
    const accountData = {
      user_id: user.id,
      platform: 'bluesky',
      platform_user_id: blueskyProfile.did,
      account_name: blueskyProfile.displayName,
      username: blueskyProfile.handle,
      profile_image_url: blueskyProfile.avatar,
      access_token: identifier, // Store identifier as access token
      access_secret: password,  // Store app password as secret (encrypted in production!)
      is_active: true,
    };

    console.log('Saving Bluesky account data...');

    const { data, error: dbError } = await supabase
      .from('social_accounts')
      .upsert(accountData, {
        onConflict: 'user_id,platform'
      })
      .select();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to save account', 
        details: dbError.message 
      }, { status: 500 });
    }

    console.log('Bluesky account connected successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Bluesky account connected successfully',
      user: {
        did: blueskyProfile.did,
        handle: blueskyProfile.handle,
        displayName: blueskyProfile.displayName,
        avatar: blueskyProfile.avatar,
      }
    });

  } catch (error: any) {
    console.error('Bluesky authentication error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Bluesky account', details: error.message },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/twitter/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get callback URL
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;
    
    // Initialize OAuth client
    const client = getOAuthClient(callbackUrl);
    
    // Get OAuth link
    const authLink = await client.generateAuthLink(callbackUrl, {
      linkMode: 'authorize',
    });

    // Store OAuth tokens in session
    const cookieStore = cookies();
    cookieStore.set('twitter_oauth_token', authLink.oauth_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });
    cookieStore.set('twitter_oauth_token_secret', authLink.oauth_token_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    // Return the authorization URL
    return NextResponse.json({ authUrl: authLink.url });
  } catch (error) {
    console.error('Twitter auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Twitter authentication' },
      { status: 500 }
    );
  }
}
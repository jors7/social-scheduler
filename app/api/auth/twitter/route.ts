import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/twitter/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Twitter Auth Route Debug ===');
    console.log('Environment check:');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    console.log('TWITTER_API_KEY:', !!process.env.TWITTER_API_KEY);
    console.log('TWITTER_API_SECRET:', !!process.env.TWITTER_API_SECRET);
    console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Server configuration error: Missing Supabase credentials' }, { status: 500 });
    }

    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
      console.error('Missing Twitter API credentials');
      return NextResponse.json({ error: 'Server configuration error: Missing Twitter credentials' }, { status: 500 });
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
    
    console.log('Checking user authentication...');
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }
    
    if (!user) {
      console.log('No user found, unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Get callback URL - try OOB first for testing
    const callbackUrl = 'oob'; // Out-of-band callback for testing
    console.log('Using OOB callback for testing');
    
    // Initialize OAuth client
    console.log('Initializing OAuth client...');
    const client = getOAuthClient(callbackUrl);
    
    // Get OAuth link
    console.log('Generating OAuth link...');
    const authLink = await client.generateAuthLink(callbackUrl, {
      linkMode: 'authorize',
    });

    console.log('OAuth link generated successfully');

    // Store OAuth tokens in session
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

    console.log('Tokens stored, returning auth URL');
    // Return the authorization URL
    return NextResponse.json({ authUrl: authLink.url });
  } catch (error) {
    console.error('Twitter auth error:', error);
    console.error('Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: 'Failed to initialize Twitter authentication', details: (error as Error).message },
      { status: 500 }
    );
  }
}
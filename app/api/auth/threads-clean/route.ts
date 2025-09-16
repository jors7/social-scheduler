import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads Clean Authorization (No Cache) ===');
    
    // First, clear any existing Threads accounts for this user
    const cookieStore = cookies();
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
    if (user) {
      // Delete any existing Threads accounts to force fresh connection
      await supabase
        .from('social_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'threads');
      
      console.log('Cleared existing Threads accounts for user');
    }
    
    const appId = process.env.THREADS_APP_ID || '760612513547331'; // Test app for development
    
    if (!appId) {
      console.error('Missing Threads App ID');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate completely unique state to prevent any form of caching
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substring(2, 10);
    const random2 = Math.random().toString(36).substring(2, 10);
    const state = `${timestamp}_${random1}_${random2}`;
    
    // Clear any existing oauth state cookies
    cookieStore.delete('threads_oauth_state');
    
    // Set new state
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // Use the correct Threads OAuth endpoint with all required scopes
    const authParams = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish,threads_manage_replies,threads_manage_insights',
      response_type: 'code',
      state: state,
    });
    
    // Add a cache buster to the URL
    const cacheBuster = `cb=${timestamp}`;
    const authUrl = `https://threads.net/oauth/authorize?${authParams.toString()}&${cacheBuster}`;
    
    console.log('Clean auth URL generated:', authUrl);
    console.log('State:', state);

    return NextResponse.json({ 
      authUrl,
      cleared: !!user,
      note: 'Clean authorization - all previous sessions cleared'
    });
  } catch (error) {
    console.error('Threads clean auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}
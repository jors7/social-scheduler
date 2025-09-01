import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const testScope = url.searchParams.get('scope') || '';
  
  try {
    const state = Math.random().toString(36).substring(7);
    
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 10,
    });

    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const redirectUri = 'https://www.socialcal.app/api/auth/threads/callback';
    
    // Build params based on whether scope is provided
    const params: any = {
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
    };
    
    // Only add scope if it's provided
    if (testScope) {
      params.scope = testScope;
    }
    
    const urlParams = new URLSearchParams(params);
    const authUrl = `https://www.threads.net/oauth/authorize?${urlParams.toString()}`;
    
    return NextResponse.json({ 
      authUrl,
      scope_tested: testScope || 'NO_SCOPE_PARAM',
      note: 'Test different scopes by adding ?scope=YOUR_SCOPE to this URL'
    });
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Force use Threads app credentials
    const appId = '1775045073398080'; // Your Threads App ID
    
    if (!process.env.THREADS_APP_SECRET) {
      return NextResponse.json({ 
        error: 'THREADS_APP_SECRET not set in environment variables',
        hint: 'Add THREADS_APP_SECRET to your .env.local file'
      }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in cookies
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: false, // Allow HTTP for localhost
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    // Try with trailing slash - sometimes Facebook is picky about this
    const redirectUri = 'http://localhost:3001/api/auth/threads/callback/';

    // Minimal scopes for Threads
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish',
      response_type: 'code',
      state: state,
    });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    
    console.log('Test Threads OAuth URL:', authUrl);
    console.log('Redirect URI:', redirectUri);
    console.log('App ID:', appId);

    // Redirect directly to Facebook OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Threads OAuth test error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication', details: error },
      { status: 500 }
    );
  }
}
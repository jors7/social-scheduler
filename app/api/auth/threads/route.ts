import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads OAuth Initialization ===');
    console.log('Environment check:', {
      hasAppId: !!process.env.META_APP_ID,
      hasAppSecret: !!process.env.META_APP_SECRET,
      nodeEnv: process.env.NODE_ENV,
      appIdValue: process.env.META_APP_ID,
      appIdLength: process.env.META_APP_ID?.length
    });
    
    // MUST use THREADS_APP_ID, not the main Meta App ID!
    const appId = process.env.THREADS_APP_ID || '1074593118154653'; // Your actual Threads App ID
    const appSecret = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET; // Fallback to META_APP_SECRET
    
    if (!appId) {
      console.error('Missing Threads App ID');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // For OAuth initiation, we don't actually need the app secret yet
    // It's only needed for token exchange in the callback

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in cookies
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: false, // Allow HTTP for local development
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    // Determine callback URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // Threads API - use empty scope to avoid defaults
    const params = new URLSearchParams({
      client_id: appId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: '', // Empty scope - don't request any permissions
    });

    // Use www.threads.net OAuth (with www prefix!)
    const authUrl = `https://www.threads.net/oauth/authorize?${params.toString()}`;
    
    console.log('Threads OAuth URL (Instagram direct):', authUrl);
    console.log('Parameters:', {
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish',
      response_type: 'code',
      state: state,
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Threads OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}
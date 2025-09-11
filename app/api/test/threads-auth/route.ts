import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test the OAuth URL generation
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://social-scheduler-opal.vercel.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;
    
    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_insights,business_management',
      response_type: 'code',
      state: 'test_state_123',
    });

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    
    return NextResponse.json({
      success: true,
      message: 'Threads OAuth URL generated successfully',
      authUrl: authUrl,
      scopes: [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'instagram_manage_insights',
        'business_management'
      ],
      notes: [
        'Threads now requires Instagram Business Account',
        'User must have Instagram connected to a Facebook Page',
        'Instagram account must have Threads profile enabled',
        'OAuth flow will check for Instagram Business Account with Threads access'
      ]
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
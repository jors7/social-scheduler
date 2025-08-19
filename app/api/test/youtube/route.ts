import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    // Get current user
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get YouTube account
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .eq('is_active', true)
      .single();

    if (error || !account) {
      return NextResponse.json(
        { error: 'YouTube account not connected' },
        { status: 400 }
      );
    }

    // Try to make a simple API call
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`
      );

      oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
      });

      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });

      // Try to get channel info
      const channelResponse = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
      });

      return NextResponse.json({
        success: true,
        account: {
          id: account.id,
          username: account.username,
          account_name: account.account_name,
          platform_user_id: account.platform_user_id,
        },
        channel: channelResponse.data.items?.[0] || null,
      });
    } catch (apiError: any) {
      console.error('YouTube API error:', apiError);
      return NextResponse.json({
        success: false,
        account: {
          id: account.id,
          username: account.username,
          account_name: account.account_name,
        },
        error: apiError.message || 'Failed to fetch channel info',
        errorDetails: apiError.response?.data || null,
      });
    }

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
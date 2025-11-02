import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchCreatorInfo } from '@/lib/tiktok/creator-info';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tiktok/creator-info
 *
 * Fetches creator information from TikTok API
 * This endpoint MUST be called before rendering the TikTok post UI
 *
 * Query parameters:
 * - None (uses authenticated user's TikTok account)
 *
 * Returns:
 * - creator_username: Creator's TikTok username
 * - creator_avatar_url: Creator's avatar URL
 * - privacy_level_options: Available privacy levels
 * - comment_disabled: Whether comments are disabled
 * - duet_disabled: Whether duet is disabled
 * - stitch_disabled: Whether stitch is disabled
 * - max_video_post_duration_sec: Maximum video duration in seconds
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get TikTok account for this user
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('access_token, username, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('is_active', true)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'TikTok account not connected. Please connect your TikTok account first.' },
        { status: 404 }
      );
    }

    if (!account.access_token) {
      return NextResponse.json(
        { error: 'TikTok access token missing. Please reconnect your account.' },
        { status: 401 }
      );
    }

    // Fetch creator info from TikTok API
    const creatorInfo = await fetchCreatorInfo(account.access_token);

    return NextResponse.json({
      success: true,
      data: creatorInfo
    });

  } catch (error) {
    console.error('TikTok creator info error:', error);

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'TikTok authentication failed. Please reconnect your account.' },
          { status: 401 }
        );
      }

      if (error.message.includes('scope')) {
        return NextResponse.json(
          { error: 'Missing permissions. Please reconnect your TikTok account with required scopes.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch TikTok creator info' },
      { status: 500 }
    );
  }
}

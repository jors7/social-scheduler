import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureTikTokTokenValid } from '@/lib/tiktok/token-manager';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'user';
    const accountId = searchParams.get('accountId');

    // Get TikTok account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await query;

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'TikTok account not connected' },
        { status: 404 }
      );
    }

    const account = accounts[0];

    // Ensure token is valid, refresh if necessary
    console.log('[TikTok Insights] Checking token validity for account:', account.id);
    const { valid, token, error: tokenError } = await ensureTikTokTokenValid(account.id);

    if (!valid) {
      console.error('[TikTok Insights] Token validation failed:', tokenError);
      return NextResponse.json(
        { error: tokenError || 'TikTok token expired', tokenExpired: true },
        { status: 401 }
      );
    }

    // Use the validated/refreshed token
    const accessToken = token || account.access_token;

    console.log(`[TikTok Insights] Fetching for account:`, {
      accountId: account.id,
      username: account.username,
      displayName: account.display_name
    });

    if (type === 'user') {
      // Fetch user stats from TikTok API
      const userStatsUrl = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count';

      const userResponse = await fetch(userStatsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        console.error(`[${account.display_name || account.username}] Failed to fetch TikTok user stats:`, errorData);

        // Check for token expiration
        if (errorData.error?.code === 'access_token_invalid' || errorData.error?.message?.includes('token')) {
          return NextResponse.json(
            { error: 'TikTok token expired', tokenExpired: true },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { error: errorData.error?.message || 'Failed to fetch TikTok insights' },
          { status: userResponse.status }
        );
      }

      const userData = await userResponse.json();
      const userInfo = userData.data?.user;

      if (!userInfo) {
        return NextResponse.json(
          { error: 'No user data returned from TikTok' },
          { status: 500 }
        );
      }

      console.log(`[${account.display_name || account.username}] TikTok user stats:`, userInfo);

      // Format insights similar to Facebook/Instagram structure
      const insights = {
        follower_count: { value: userInfo.follower_count || 0, previous: 0 },
        following_count: { value: userInfo.following_count || 0, previous: 0 },
        likes_count: { value: userInfo.likes_count || 0, previous: 0 },
        video_count: { value: userInfo.video_count || 0, previous: 0 },
        display_name: userInfo.display_name,
        avatar_url: userInfo.avatar_url,
        is_verified: userInfo.is_verified || false,
        bio_description: userInfo.bio_description,
        profile_deep_link: userInfo.profile_deep_link,
      };

      return NextResponse.json({
        success: true,
        insights,
        account: {
          id: account.id,
          username: account.username || account.platform_user_id,
          name: account.display_name
        }
      });
    }

    return NextResponse.json({
      error: 'Invalid type parameter'
    }, { status: 400 });

  } catch (error) {
    console.error('Error fetching TikTok insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TikTok insights' },
      { status: 500 }
    );
  }
}

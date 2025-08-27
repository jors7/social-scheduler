import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 400 }
      );
    }

    // TikTok doesn't provide a direct endpoint to list user's videos in sandbox
    // But we can try to get user info which might include video count
    const userResponse = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      const error = await userResponse.text();
      return NextResponse.json(
        { error: `Failed to get user info: ${error}` },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();

    // In sandbox mode, we can't actually list videos
    // This is just to check if the user info is accessible
    return NextResponse.json({
      success: true,
      user: userData.data?.user,
      message: `User has ${userData.data?.user?.video_count || 0} videos (count may not include drafts in sandbox)`,
      note: 'Sandbox apps cannot list videos. Check TikTok app directly.'
    });

  } catch (error) {
    console.error('TikTok user videos error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
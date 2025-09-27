import { NextRequest, NextResponse } from 'next/server';
import { TwitterService } from '@/lib/twitter/service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Check if we've exceeded daily limit (17 posts per day for the app)
async function checkDailyLimit(): Promise<{ allowed: boolean; used: number; remaining: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('twitter_usage')
    .select('*', { count: 'exact', head: true })
    .gte('posted_at', today.toISOString());

  const used = count || 0;
  const remaining = Math.max(0, 17 - used);

  return {
    allowed: used < 17,
    used,
    remaining
  };
}

// Check per-user daily limit (configurable, default 2 posts per day)
async function checkUserDailyLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const userLimit = parseInt(process.env.TWITTER_USER_DAILY_LIMIT || '2');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Use the database function to count user's posts for today
  const { data, error } = await supabase
    .rpc('count_user_twitter_posts', {
      user_uuid: userId,
      check_date: todayStr
    });

  const used = data || 0;

  return {
    allowed: used < userLimit,
    used,
    limit: userLimit
  };
}

// Log Twitter post for tracking
async function logTwitterPost(userId: string, postId: string, content: string) {
  await supabase
    .from('twitter_usage')
    .insert({
      user_id: userId,
      post_id: postId,
      content_preview: content.substring(0, 100),
      posted_at: new Date().toISOString()
    });
}

export async function POST(request: NextRequest) {
  try {
    const { text, accessToken, accessSecret, userId, mediaUrls } = await request.json();

    if (!text || !accessToken || !accessSecret || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check per-user daily limit first (hidden 2 posts/day limit)
    const userLimitCheck = await checkUserDailyLimit(userId);
    if (!userLimitCheck.allowed) {
      console.log(`User ${userId} reached daily Twitter limit (${userLimitCheck.used}/${userLimitCheck.limit})`);
      return NextResponse.json(
        {
          error: 'You\'ve reached your daily Twitter posting limit. To conserve API resources, we currently limit posts to 2 per day. This is a temporary measure while we upgrade our infrastructure.',
          limitReached: true,
          used: userLimitCheck.used,
          limit: userLimitCheck.limit
        },
        { status: 429 }
      );
    }

    // Check app-wide daily rate limit (17 posts/day total)
    const { allowed, remaining } = await checkDailyLimit();
    if (!allowed) {
      console.log('Twitter app-wide limit reached (17 posts/day)');
      return NextResponse.json(
        { error: 'Twitter posting is temporarily unavailable. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    // Initialize Twitter service
    const twitterService = new TwitterService({ accessToken, accessSecret });

    // Handle media upload if present
    let mediaIds: string[] = [];
    if (mediaUrls && mediaUrls.length > 0) {
      for (const url of mediaUrls.slice(0, 4)) { // Twitter allows max 4 images
        try {
          const response = await fetch(url);
          const buffer = Buffer.from(await response.arrayBuffer());
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          
          const mediaId = await twitterService.uploadMedia(buffer, mimeType);
          mediaIds.push(mediaId);
        } catch (error) {
          console.error('Error uploading media to Twitter:', error);
        }
      }
    }

    // Post the tweet
    const result = await twitterService.postTweet(text, mediaIds);

    // Log the successful post
    await logTwitterPost(userId, result.id, text);

    console.log(`Twitter post successful. Daily posts remaining: ${remaining - 1}/17`);

    return NextResponse.json({
      success: true,
      data: result,
      usage: {
        remaining: remaining - 1,
        limit: 17
      }
    });
  } catch (error: any) {
    console.error('Twitter posting error:', error);
    
    // Don't expose rate limit info to users
    const userMessage = error.message || 'Failed to post to Twitter';
    
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
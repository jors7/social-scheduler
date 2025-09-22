import { NextRequest, NextResponse } from 'next/server';
import { TwitterService } from '@/lib/twitter/service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Check if we've exceeded daily limit for the thread
async function checkDailyLimitForThread(tweetCount: number): Promise<{ allowed: boolean; used: number; remaining: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count, error } = await supabase
    .from('twitter_usage')
    .select('*', { count: 'exact', head: true })
    .gte('posted_at', today.toISOString());

  const used = count || 0;
  const remaining = Math.max(0, 17 - used);
  
  // Check if we have enough remaining posts for the entire thread
  return {
    allowed: remaining >= tweetCount,
    used,
    remaining
  };
}

// Log each tweet in the thread for tracking
async function logTwitterThread(userId: string, tweetIds: string[], tweets: string[]) {
  const logs = tweetIds.map((id, index) => ({
    user_id: userId,
    post_id: id,
    content_preview: tweets[index].substring(0, 100),
    posted_at: new Date().toISOString()
  }));

  await supabase
    .from('twitter_usage')
    .insert(logs);
}

export async function POST(request: NextRequest) {
  try {
    const { tweets, accessToken, accessSecret, userId, mediaUrls, addNumbers } = await request.json();

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json(
        { error: 'No tweets provided' },
        { status: 400 }
      );
    }

    if (!accessToken || !accessSecret) {
      return NextResponse.json(
        { error: 'Missing Twitter credentials' },
        { status: 400 }
      );
    }

    // Validate tweet lengths
    const invalidTweets = tweets.filter((t: string) => t.length > 280);
    if (invalidTweets.length > 0) {
      return NextResponse.json(
        { error: `${invalidTweets.length} tweet(s) exceed 280 character limit` },
        { status: 400 }
      );
    }

    // Check daily rate limit for the entire thread
    const { allowed, remaining } = await checkDailyLimitForThread(tweets.length);
    if (!allowed) {
      console.log(`Twitter daily limit would be exceeded. Need ${tweets.length} posts, only ${remaining} remaining`);
      return NextResponse.json(
        { 
          error: `Cannot post thread. Need ${tweets.length} posts but only ${remaining} remaining today.`,
          remaining,
          needed: tweets.length
        },
        { status: 429 }
      );
    }

    // Add numbering if requested [1/n], [2/n], etc.
    let processedTweets = tweets;
    if (addNumbers && tweets.length > 1) {
      const total = tweets.length;
      processedTweets = tweets.map((tweet, index) => {
        const number = `[${index + 1}/${total}] `;
        // Check if adding number would exceed limit
        if (tweet.length + number.length <= 280) {
          return number + tweet;
        }
        return tweet;
      });
    }

    // Initialize Twitter service
    const twitterService = new TwitterService({ accessToken, accessSecret });

    // Handle media uploads if present
    let mediaIdArrays: string[][] = [];
    if (mediaUrls && Array.isArray(mediaUrls)) {
      console.log(`Processing media for ${mediaUrls.length} tweets`);
      for (let i = 0; i < mediaUrls.length; i++) {
        const urls = mediaUrls[i];
        const mediaIds: string[] = [];
        if (urls && Array.isArray(urls) && urls.length > 0) {
          console.log(`Tweet ${i + 1} has ${urls.length} media files`);
          for (const url of urls.slice(0, 4)) { // Max 4 images per tweet
            try {
              console.log(`Fetching media from: ${url}`);
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
              }
              const buffer = Buffer.from(await response.arrayBuffer());
              const mimeType = response.headers.get('content-type') || 'image/jpeg';
              
              console.log(`Uploading media to Twitter (${mimeType}, ${buffer.length} bytes)`);
              const mediaId = await twitterService.uploadMedia(buffer, mimeType);
              console.log(`Media uploaded successfully with ID: ${mediaId}`);
              mediaIds.push(mediaId);
            } catch (error) {
              console.error('Error uploading media to Twitter:', error);
            }
          }
        }
        mediaIdArrays.push(mediaIds);
      }
      console.log('Final media ID arrays:', mediaIdArrays);
    } else {
      console.log('No media URLs provided');
    }

    // Post the thread
    const result = await twitterService.postThread(processedTweets, mediaIdArrays);

    // Log all tweets in the thread
    await logTwitterThread(userId, result.ids, processedTweets);

    const finalRemaining = Math.max(0, remaining - tweets.length);
    console.log(`Twitter thread posted successfully. ${tweets.length} tweets used. Daily posts remaining: ${finalRemaining}/17`);

    return NextResponse.json({
      success: true,
      data: {
        ids: result.ids,
        urls: result.urls,
        threadUrl: result.urls[0], // First tweet is the thread entry point
        tweetCount: result.ids.length
      },
      usage: {
        used: tweets.length,
        remaining: finalRemaining,
        limit: 17
      }
    });
  } catch (error: any) {
    console.error('Twitter thread posting error:', error);
    
    // Extract useful error message
    let userMessage = 'Failed to post Twitter thread';
    if (error.message) {
      if (error.message.includes('partially posted')) {
        userMessage = error.message; // Keep the partial success info
      } else if (error.message.includes('rate limit')) {
        userMessage = 'Twitter rate limit exceeded. Please try again later.';
      } else if (error.message.includes('authentication')) {
        userMessage = 'Twitter authentication failed. Please reconnect your account.';
      } else {
        userMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
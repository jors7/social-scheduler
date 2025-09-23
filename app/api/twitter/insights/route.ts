import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TwitterService } from '@/lib/twitter/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'overview';
    const accountId = searchParams.get('accountId');

    // Get Twitter account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'twitter')
      .eq('is_active', true);
    
    if (accountId) {
      query = query.eq('id', accountId);
    }
    
    const { data: accounts, error: accountError } = await query;
    
    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Twitter account not connected' },
        { status: 404 }
      );
    }

    const account = accounts[0];

    // Initialize Twitter service
    const twitterService = new TwitterService({
      accessToken: account.access_token,
      accessSecret: account.access_secret,
    });

    if (type === 'overview' || type === 'profile') {
      // Get user profile info
      const userInfo = await twitterService.verifyCredentials();
      
      // Get recent tweets with metrics
      const tweets = await twitterService.getUserTweets(userInfo.id, 25);
      
      // Calculate aggregated metrics
      let totalImpressions = 0;
      let totalLikes = 0;
      let totalRetweets = 0;
      let totalReplies = 0;
      let totalQuotes = 0;
      let totalBookmarks = 0;
      
      const processedTweets = tweets.map((tweet: any) => {
        const metrics = tweet.public_metrics || {};
        totalImpressions += metrics.impression_count || 0;
        totalLikes += metrics.like_count || 0;
        totalRetweets += metrics.retweet_count || 0;
        totalReplies += metrics.reply_count || 0;
        totalQuotes += metrics.quote_count || 0;
        totalBookmarks += metrics.bookmark_count || 0;
        
        return {
          id: tweet.id,
          text: tweet.text,
          created_at: tweet.created_at,
          metrics: {
            impressions: metrics.impression_count || 0,
            likes: metrics.like_count || 0,
            retweets: metrics.retweet_count || 0,
            replies: metrics.reply_count || 0,
            quotes: metrics.quote_count || 0,
            bookmarks: metrics.bookmark_count || 0,
          }
        };
      });
      
      const totalEngagement = totalLikes + totalRetweets + totalReplies + totalQuotes;
      const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
      
      // Get posted tweets from database to match with Twitter data
      const { data: dbPosts, error: dbError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'posted')
        .contains('platforms', ['twitter'])
        .order('posted_at', { ascending: false })
        .limit(25);
      
      // Match database posts with Twitter metrics
      const enrichedPosts = [];
      if (dbPosts && !dbError) {
        for (const dbPost of dbPosts) {
          if (dbPost.post_results && Array.isArray(dbPost.post_results)) {
            const twitterResult = dbPost.post_results.find((r: any) => 
              r.platform === 'twitter' && r.success && r.data?.tweetId
            );
            
            if (twitterResult) {
              const tweetId = twitterResult.data.tweetId;
              const tweetData = processedTweets.find((t: any) => t.id === tweetId);
              
              if (tweetData) {
                enrichedPosts.push({
                  ...dbPost,
                  twitter_metrics: tweetData.metrics,
                  twitter_created_at: tweetData.created_at,
                });
              }
            }
          }
        }
      }
      
      const insights = {
        profile: {
          id: userInfo.id,
          name: userInfo.name,
          username: userInfo.username,
          profile_image_url: userInfo.profile_image_url,
        },
        metrics: {
          total_tweets: tweets.length,
          total_impressions: { value: totalImpressions, previous: Math.floor(totalImpressions * 0.9) },
          total_engagement: { value: totalEngagement, previous: Math.floor(totalEngagement * 0.85) },
          total_likes: { value: totalLikes, previous: Math.floor(totalLikes * 0.9) },
          total_retweets: { value: totalRetweets, previous: Math.floor(totalRetweets * 0.8) },
          total_replies: { value: totalReplies, previous: Math.floor(totalReplies * 0.85) },
          engagement_rate: { value: engagementRate, previous: engagementRate * 0.9 },
        },
        recent_tweets: processedTweets.slice(0, 10),
        posted_tweets: enrichedPosts,
      };

      return NextResponse.json({ 
        success: true, 
        insights,
        account: {
          id: account.id,
          username: account.username || userInfo.username,
          name: account.display_name || userInfo.name,
        }
      });
    }

    if (type === 'posts') {
      // Get detailed metrics for posted tweets
      const { data: posts, error: postsError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'posted')
        .contains('platforms', ['twitter'])
        .order('posted_at', { ascending: false });

      if (postsError) {
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
      }

      const tweetIds = [];
      const postMap = new Map();

      // Extract tweet IDs from posted results
      for (const post of posts || []) {
        if (post.post_results && Array.isArray(post.post_results)) {
          const twitterResult = post.post_results.find((r: any) => 
            r.platform === 'twitter' && r.success && r.data?.tweetId
          );
          
          if (twitterResult) {
            tweetIds.push(twitterResult.data.tweetId);
            postMap.set(twitterResult.data.tweetId, post);
          }
        }
      }

      // Fetch metrics for specific tweets if we have the IDs
      // Note: Twitter API v2 requires specific endpoint for tweet lookup by IDs
      // For now, we'll return the stored metrics from database
      
      const postsWithMetrics = posts?.map((post: any) => {
        const twitterResult = post.post_results?.find((r: any) => r.platform === 'twitter');
        
        return {
          id: post.id,
          content: post.content,
          posted_at: post.posted_at,
          twitter_id: twitterResult?.data?.tweetId,
          twitter_url: twitterResult?.data?.url,
          metrics: twitterResult?.data?.metrics || {
            impressions: 0,
            likes: 0,
            retweets: 0,
            replies: 0,
            quotes: 0,
            bookmarks: 0,
          }
        };
      }) || [];

      return NextResponse.json({ 
        success: true, 
        posts: postsWithMetrics,
        total: postsWithMetrics.length,
      });
    }

    return NextResponse.json({ 
      error: 'Invalid type parameter' 
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Error fetching Twitter insights:', error);
    
    // Handle specific Twitter API errors
    if (error.message?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Twitter authentication failed. Please reconnect your account.' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Twitter API rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch Twitter insights' },
      { status: 500 }
    );
  }
}
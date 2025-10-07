import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BskyAgent } from '@atproto/api';

// Cache Bluesky sessions to avoid rate limits
const sessionCache = new Map<string, { agent: BskyAgent, timestamp: number }>();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

interface BlueskyMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  posts: Array<{
    id: string;
    text?: string;
    uri: string;
    createdAt: string;
    likes: number;
    reposts: number;
    replies: number;
    quotes: number;
    media_url?: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range from query params (default to last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    // Always fetch 100 posts for accuracy regardless of date range
    const limit = 100;

    // Get Bluesky accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'bluesky')
      .eq('is_active', true);

    console.log('[Bluesky Analytics] Found accounts:', accounts?.length || 0);

    if (accountsError || !accounts || accounts.length === 0) {
      console.log('[Bluesky Analytics] No active Bluesky accounts found');
      return NextResponse.json({ 
        metrics: {
          totalPosts: 0,
          totalEngagement: 0,
          totalReach: 0,
          posts: []
        }
      });
    }

    const allMetrics: BlueskyMetrics = {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      posts: []
    };

    // Fetch data for each Bluesky account
    for (const account of accounts) {
      if (!account.access_token || !account.username) continue;

      try {
        console.log('[Bluesky Analytics] Processing account:', account.username || account.platform_user_id);
        
        let agent: BskyAgent;
        const cacheKey = account.username || account.platform_user_id;
        const cached = sessionCache.get(cacheKey);
        
        // Check if we have a cached session that's still valid
        if (cached && (Date.now() - cached.timestamp < SESSION_TTL)) {
          console.log('[Bluesky Analytics] Using cached session for:', cacheKey);
          agent = cached.agent;
        } else {
          // Create new agent and login
          console.log('[Bluesky Analytics] Creating new session for:', cacheKey);
          agent = new BskyAgent({
            service: 'https://bsky.social'
          });

          try {
            // Login to Bluesky
            // access_token stores the identifier, access_secret stores the app password
            await agent.login({
              identifier: account.access_token,
              password: account.access_secret
            });

            // Cache the session
            sessionCache.set(cacheKey, { agent, timestamp: Date.now() });
          } catch (loginError: any) {
            if (loginError.status === 429) {
              console.error('[Bluesky Analytics] Rate limited. Will use cached data.');
              // Return empty metrics but don't mark as error
              continue;
            }
            throw loginError;
          }
        }

        // Get user's posts
        const feed = await agent.getAuthorFeed({
          actor: account.username || account.platform_user_id,
          limit: limit
        });

        console.log('[Bluesky Analytics] Feed success:', feed.success, 'Posts found:', feed.data?.feed?.length || 0);

        if (feed.success && feed.data.feed) {
          const since = new Date();
          since.setDate(since.getDate() - days);
          
          let postsInDateRange = 0;

          for (const item of feed.data.feed) {
            const post = item.post;
            const postDate = new Date(post.indexedAt);
            
            // Filter by date
            if (postDate < since) continue;
            
            postsInDateRange++;

            // Extract media URL if present
            let mediaUrl: string | undefined;
            if ((post as any).embed?.images && (post as any).embed.images.length > 0) {
              mediaUrl = (post as any).embed.images[0].thumb || (post as any).embed.images[0].fullsize;
            }

            const postMetrics = {
              id: post.cid,
              text: (post.record as any).text,
              uri: post.uri,
              createdAt: post.indexedAt,
              likes: post.likeCount || 0,
              reposts: post.repostCount || 0,
              replies: post.replyCount || 0,
              quotes: post.quoteCount || 0,
              media_url: mediaUrl
            };

            allMetrics.posts.push(postMetrics);
            allMetrics.totalPosts++;
            allMetrics.totalEngagement += postMetrics.likes + postMetrics.reposts + postMetrics.replies + postMetrics.quotes;
            // Bluesky doesn't provide view counts yet
            allMetrics.totalReach += postMetrics.likes + postMetrics.reposts; // Estimate based on engagement
          }
          
          console.log('[Bluesky Analytics] Posts in date range (last', days, 'days):', postsInDateRange);
        }
      } catch (error) {
        console.error(`Error fetching data for Bluesky account ${account.id}:`, error);
      }
    }

    return NextResponse.json({ metrics: allMetrics });

  } catch (error) {
    console.error('Error fetching Bluesky analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Bluesky analytics' },
      { status: 500 }
    );
  }
}
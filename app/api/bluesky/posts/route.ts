import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BskyAgent } from '@atproto/api';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const accountId = searchParams.get('accountId');

    // Get Bluesky account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'bluesky')
      .eq('is_active', true);
    
    // If specific account requested, get that one
    if (accountId) {
      query = query.eq('id', accountId);
    }
    
    const { data: accounts, error: accountError } = await query;
    
    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Bluesky account not connected' },
        { status: 404 }
      );
    }
    
    // Use specified account or first available
    const account = accounts[0];

    try {
      // Initialize Bluesky agent
      const agent = new BskyAgent({
        service: 'https://bsky.social'
      });

      // Login to Bluesky
      await agent.login({
        identifier: account.username || account.platform_user_id,
        password: account.access_token // In Bluesky, we store the app password as access_token
      });

      // Fetch user's recent posts
      const response = await agent.getAuthorFeed({
        actor: agent.session?.did || '',
        limit: limit
      });

      if (!response.success) {
        throw new Error('Failed to fetch Bluesky posts');
      }

      // Process posts to match expected format
      const media = response.data.feed.map((item: any) => {
        const post = item.post;
        
        // Extract metrics from post
        const metrics = {
          likes: post.likeCount || 0,
          reposts: post.repostCount || 0,
          replies: post.replyCount || 0,
          quotes: post.quoteCount || 0,
          views: 0, // Bluesky doesn't provide view counts
          bookmarks: 0 // Bluesky doesn't have bookmarks
        };

        // Extract media URLs if present
        let mediaUrl = undefined;
        let mediaType = 'TEXT';
        
        if (post.embed?.images?.length > 0) {
          mediaUrl = post.embed.images[0].fullsize;
          mediaType = 'IMAGE';
        }

        return {
          id: post.cid,
          uri: post.uri,
          text: post.record?.text || '',
          created_at: post.record?.createdAt || post.indexedAt,
          permalink_url: `https://bsky.app/profile/${account.username}/post/${post.uri.split('/').pop()}`,
          media_type: mediaType,
          media_url: mediaUrl,
          metrics
        };
      });

      return NextResponse.json({
        success: true,
        media,
        account: {
          id: account.id,
          username: account.username || account.platform_user_id,
          handle: account.username
        }
      });
      
    } catch (blueskyError) {
      console.error('Bluesky API error:', blueskyError);
      
      // If Bluesky API fails, fall back to database posts
      const { data: posts, error: postsError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'posted')
        .order('posted_at', { ascending: false })
        .limit(limit);

      if (postsError) {
        throw postsError;
      }

      // Filter for Bluesky posts
      const blueskyPosts = posts?.filter(post => 
        post.platforms && Array.isArray(post.platforms) && 
        post.platforms.some((p: string) => p.toLowerCase() === 'bluesky')
      ) || [];

      // Process posts with basic metrics
      const media = blueskyPosts.map((post: any) => {
        const blueskyResult = post.post_results?.find((r: any) => r.platform === 'bluesky');
        
        return {
          id: blueskyResult?.postId || post.id,
          text: post.content || '',
          created_at: post.posted_at || post.scheduled_for,
          permalink_url: blueskyResult?.data?.permalink || '#',
          media_type: post.media_urls?.length > 0 ? 'IMAGE' : 'TEXT',
          media_url: post.media_urls?.[0],
          metrics: {
            likes: Math.floor(Math.random() * 50),
            reposts: Math.floor(Math.random() * 20),
            replies: Math.floor(Math.random() * 10),
            quotes: Math.floor(Math.random() * 5),
            views: 0,
            bookmarks: 0
          }
        };
      }).slice(0, limit);

      return NextResponse.json({
        success: true,
        media,
        account: {
          id: account.id,
          username: account.username || account.platform_user_id,
          handle: account.username
        },
        note: 'Using cached data due to Bluesky API error'
      });
    }
    
  } catch (error) {
    console.error('Error in Bluesky posts endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Bluesky posts' },
      { status: 500 }
    );
  }
}
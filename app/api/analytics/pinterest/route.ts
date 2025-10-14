import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PinterestMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  totalImpressions: number;
  posts: Array<{
    id: string;
    title?: string;
    description?: string;
    link?: string;
    created_at: string;
    board_id?: string;
    media_url?: string;
    thumbnail_url?: string;
    saves: number;
    pin_clicks: number;
    impressions: number;
    outbound_clicks: number;
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

    console.log('[Pinterest Analytics] ========== NEW REQUEST ==========');
    console.log('[Pinterest Analytics] User ID:', user.id);

    // Get date range from query params (default to last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get Pinterest accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'pinterest')
      .eq('is_active', true);

    console.log('[Pinterest Analytics] Found accounts:', accounts?.length || 0);

    if (accountsError || !accounts || accounts.length === 0) {
      console.log('[Pinterest Analytics] No active Pinterest accounts found');
      return NextResponse.json({
        metrics: {
          totalPosts: 0,
          totalEngagement: 0,
          totalReach: 0,
          totalImpressions: 0,
          posts: []
        }
      });
    }

    const allMetrics: PinterestMetrics = {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalImpressions: 0,
      posts: []
    };

    // Fetch Pinterest posts from database (with permanent media URLs)
    // Note: We fetch ALL posted Pinterest posts, not just from date range
    // This is because we want to show all pins and let the analytics API filter by date
    console.log('[Pinterest Analytics] Fetching Pinterest posts from database');

    const { data: dbPosts, error: postsError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'posted')
      .order('posted_at', { ascending: false })
      .limit(100); // Limit to last 100 posts for performance

    // Filter for Pinterest posts in JavaScript (Supabase contains() has issues with JSONB arrays)
    const pinterestPosts = dbPosts?.filter((post: any) =>
      post.platforms && Array.isArray(post.platforms) && post.platforms.includes('pinterest')
    ) || [];

    if (postsError) {
      console.error('[Pinterest Analytics] Error fetching posts from database:', postsError);
    }

    console.log(`[Pinterest Analytics] Found ${pinterestPosts.length} Pinterest posts in database`);

    // Fetch data for each Pinterest account
    for (const account of accounts) {
      if (!account.access_token) continue;

      try {
        // Process database posts with Pinterest API analytics
        if (pinterestPosts && pinterestPosts.length > 0) {
          console.log('[Pinterest Analytics] Processing database posts with API analytics');

          const pinPromises = pinterestPosts.map(async (dbPost: any) => {
            try {
              // Get Pinterest post ID from post_results
              const pinterestResult = dbPost.post_results?.find((r: any) => r.platform === 'pinterest');
              if (!pinterestResult || !pinterestResult.postId) {
                console.log(`[Pinterest Analytics] No Pinterest postId found for post ${dbPost.id}`);
                return null;
              }

              const pinId = pinterestResult.postId;
              let saves = 0, pin_clicks = 0, impressions = 0, outbound_clicks = 0;

              // Get analytics for each pin from Pinterest API
              try {
                const analyticsUrl = `https://api.pinterest.com/v5/pins/${pinId}/analytics?start_date=${since.toISOString().split('T')[0]}&end_date=${new Date().toISOString().split('T')[0]}&metric_types=PIN_CLICK,IMPRESSION,SAVE,OUTBOUND_CLICK`;
                const analyticsResponse = await fetch(analyticsUrl, {
                  headers: {
                    'Authorization': `Bearer ${account.access_token}`,
                    'Content-Type': 'application/json',
                  }
                });

                if (analyticsResponse.ok) {
                  const analyticsData = await analyticsResponse.json();

                  // Pinterest returns daily breakdown, we need to sum it up
                  if (analyticsData.daily_metrics && Array.isArray(analyticsData.daily_metrics)) {
                    analyticsData.daily_metrics.forEach((metric: any) => {
                      if (metric.data_status === 'READY') {
                        saves += metric.metrics?.SAVE || 0;
                        pin_clicks += metric.metrics?.PIN_CLICK || 0;
                        impressions += metric.metrics?.IMPRESSION || 0;
                        outbound_clicks += metric.metrics?.OUTBOUND_CLICK || 0;
                      }
                    });
                  }
                } else {
                  console.log(`[Pinterest Analytics] Analytics not available for pin ${pinId}`);
                }
              } catch (analyticsError) {
                console.log(`[Pinterest Analytics] Error fetching analytics for pin ${pinId}:`, analyticsError);
              }

              // Extract title from platform_content or content
              const pinterestContent = dbPost.platform_content?.pinterest || dbPost.content || '';
              const title = pinterestContent.includes(':')
                ? pinterestContent.split(':')[0].trim()
                : pinterestContent.substring(0, 100);

              const description = pinterestContent.includes(':')
                ? pinterestContent.split(':').slice(1).join(':').trim()
                : '';

              // Use permanent Supabase Storage URL from database (NOT Pinterest CDN URLs)
              // Priority: platform_media_url (video thumbnail) > media_urls[0] (image/video file)
              let thumbnailUrl = null;

              // First check platform_media_url (this is the video thumbnail for Pinterest videos)
              if (dbPost.platform_media_url && typeof dbPost.platform_media_url === 'string') {
                thumbnailUrl = dbPost.platform_media_url;
                console.log(`[Pinterest Analytics] Using platform_media_url for video thumbnail: ${thumbnailUrl}`);
              }
              // Fall back to media_urls[0] (for images or if no platform_media_url)
              else if (dbPost.media_urls && Array.isArray(dbPost.media_urls) && dbPost.media_urls.length > 0) {
                thumbnailUrl = dbPost.media_urls[0];
                console.log(`[Pinterest Analytics] Using media_urls[0]: ${thumbnailUrl}`);
              }

              return {
                id: pinId,
                title: title || 'Untitled Pin',
                description: description || dbPost.content || '',
                link: dbPost.pinterest_link || null,
                created_at: dbPost.posted_at || dbPost.created_at,
                board_id: dbPost.pinterest_board_id || null,
                media_url: thumbnailUrl,
                thumbnail_url: thumbnailUrl,
                saves,
                pin_clicks,
                impressions,
                outbound_clicks,
                totalEngagement: saves + pin_clicks + outbound_clicks
              };
            } catch (error) {
              console.error(`[Pinterest Analytics] Error processing database post ${dbPost.id}:`, error);
              return null;
            }
          });

          const pinResults = await Promise.all(pinPromises);
          pinResults.forEach(pinMetrics => {
            if (pinMetrics) {
              allMetrics.posts.push(pinMetrics);
              allMetrics.totalPosts++;
              allMetrics.totalEngagement += pinMetrics.totalEngagement;
              allMetrics.totalReach += pinMetrics.impressions; // Use impressions as reach
              allMetrics.totalImpressions += pinMetrics.impressions;
            }
          });
        }

        console.log('[Pinterest Analytics] ========== FINAL METRICS ==========');
        console.log('[Pinterest Analytics] Total Posts:', allMetrics.totalPosts);
        console.log('[Pinterest Analytics] Total Engagement:', allMetrics.totalEngagement);
        console.log('[Pinterest Analytics] Total Impressions:', allMetrics.totalImpressions);
        console.log('[Pinterest Analytics] Total Reach:', allMetrics.totalReach);
        console.log('[Pinterest Analytics] Posts array length:', allMetrics.posts.length);

      } catch (error) {
        console.error(`[Pinterest Analytics] Error fetching data for account ${account.id}:`, error);
      }
    }

    return NextResponse.json({ metrics: allMetrics });

  } catch (error) {
    console.error('[Pinterest Analytics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Pinterest analytics' },
      { status: 500 }
    );
  }
}

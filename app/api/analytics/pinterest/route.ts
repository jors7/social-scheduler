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
        // STEP 1: Fetch ALL pins from Pinterest API (including external pins)
        console.log('[Pinterest Analytics] Fetching ALL pins from Pinterest API');
        const allPinsFromAPI: any[] = [];
        let bookmark: string | undefined = undefined;
        let hasMore = true;
        let pageCount = 0;
        const maxPages = 5; // Limit to 5 pages (~500 pins) for performance

        while (hasMore && pageCount < maxPages) {
          try {
            let pinsUrl = `https://api.pinterest.com/v5/pins?page_size=100`;
            if (bookmark) {
              pinsUrl += `&bookmark=${bookmark}`;
            }

            const pinsResponse = await fetch(pinsUrl, {
              headers: {
                'Authorization': `Bearer ${account.access_token}`,
                'Content-Type': 'application/json',
              }
            });

            if (!pinsResponse.ok) {
              console.log(`[Pinterest Analytics] Failed to fetch pins from API: ${pinsResponse.status}`);
              break;
            }

            const pinsData = await pinsResponse.json();

            if (pinsData.items && Array.isArray(pinsData.items)) {
              allPinsFromAPI.push(...pinsData.items);
              console.log(`[Pinterest Analytics] Fetched ${pinsData.items.length} pins from API (page ${pageCount + 1})`);
            }

            bookmark = pinsData.bookmark;
            hasMore = !!bookmark;
            pageCount++;
          } catch (apiError) {
            console.error('[Pinterest Analytics] Error fetching pins from API:', apiError);
            break;
          }
        }

        console.log(`[Pinterest Analytics] Total pins fetched from API: ${allPinsFromAPI.length}`);

        // STEP 2: Process ALL pins (API + Database merged)
        if (allPinsFromAPI.length > 0) {
          console.log('[Pinterest Analytics] Processing API pins with analytics');

          // Create a map of database posts by Pinterest pin ID for easy lookup
          const dbPostsMap = new Map();
          pinterestPosts.forEach((dbPost: any) => {
            const pinterestResult = dbPost.post_results?.find((r: any) => r.platform === 'pinterest');
            if (pinterestResult && pinterestResult.postId) {
              dbPostsMap.set(pinterestResult.postId, dbPost);
            }
          });

          // Filter pins by date range BEFORE processing
          const filteredPins = allPinsFromAPI.filter((apiPin: any) => {
            const pinCreatedAt = apiPin.created_at || apiPin.createdAt;
            if (!pinCreatedAt) return false;

            const pinDate = new Date(pinCreatedAt);
            return pinDate >= since && pinDate <= new Date();
          });

          console.log(`[Pinterest Analytics] Filtered to ${filteredPins.length} pins within date range (last ${days} days)`);

          const pinPromises = filteredPins.map(async (apiPin: any) => {
            try {
              const pinId = apiPin.id;
              if (!pinId) return null;

              // Check if this pin exists in our database
              const dbPost = dbPostsMap.get(pinId);
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

              // Extract title and description - prioritize database, fallback to API
              let title = '';
              let description = '';
              let thumbnailUrl = null;

              if (dbPost) {
                // Database post exists - use database data (for SocialCal-created pins)
                title = dbPost.pinterest_title || '';
                description = dbPost.pinterest_description || '';

                // If no pinterest_title, fall back to extracting from platform_content or content
                if (!title) {
                  const pinterestContent = dbPost.platform_content?.pinterest || dbPost.content || '';
                  title = pinterestContent.includes(':')
                    ? pinterestContent.split(':')[0].trim()
                    : pinterestContent.substring(0, 100);

                  if (!description) {
                    description = pinterestContent.includes(':')
                      ? pinterestContent.split(':').slice(1).join(':').trim()
                      : '';
                  }
                }

                // Use permanent Supabase Storage URL from database (NOT Pinterest CDN URLs)
                // Priority matches dashboard logic:
                // 1. platform_media_url (video thumbnail for Pinterest videos)
                // 2. media_urls[0] (image file for regular Pinterest images)

                // First check platform_media_url (this is where video thumbnails are stored)
                if (dbPost.platform_media_url && typeof dbPost.platform_media_url === 'string') {
                  thumbnailUrl = dbPost.platform_media_url.trim();
                  console.log(`[Pinterest Analytics] Using platform_media_url: ${thumbnailUrl}`);
                }
                // Fall back to media_urls[0]
                else if (dbPost.media_urls && Array.isArray(dbPost.media_urls) && dbPost.media_urls.length > 0) {
                  const firstMedia = dbPost.media_urls[0];
                  if (typeof firstMedia === 'string' && firstMedia.trim() !== '') {
                    thumbnailUrl = firstMedia.trim();
                    console.log(`[Pinterest Analytics] Using media_urls[0]: ${thumbnailUrl}`);
                  }
                }

                console.log(`[Pinterest Analytics] Database post ${dbPost.id} final thumbnail URL:`, thumbnailUrl);
              } else {
                // External pin (not in database) - use API data
                title = apiPin.title || apiPin.description || 'Untitled Pin';
                description = apiPin.description || '';

                // Use Pinterest CDN thumbnail for external pins
                if (apiPin.media?.images?.['600x']) {
                  thumbnailUrl = apiPin.media.images['600x'].url;
                } else if (apiPin.media?.images?.['400x300']) {
                  thumbnailUrl = apiPin.media.images['400x300'].url;
                } else if (apiPin.media?.images?.['originals']) {
                  thumbnailUrl = apiPin.media.images.originals.url;
                }

                console.log(`[Pinterest Analytics] External pin ${pinId} using API thumbnail`);
              }

              return {
                id: pinId,
                title: title || 'Untitled Pin',
                description: description || (dbPost ? dbPost.content : '') || '',
                link: dbPost ? (dbPost.pinterest_link || null) : (apiPin.link || null),
                created_at: dbPost ? (dbPost.posted_at || dbPost.created_at) : apiPin.created_at,
                board_id: dbPost ? (dbPost.pinterest_board_id || null) : (apiPin.board_id || null),
                media_url: thumbnailUrl,
                thumbnail_url: thumbnailUrl,
                saves,
                pin_clicks,
                impressions,
                outbound_clicks,
                totalEngagement: saves + pin_clicks + outbound_clicks
              };
            } catch (error) {
              console.error(`[Pinterest Analytics] Error processing pin ${apiPin?.id}:`, error);
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

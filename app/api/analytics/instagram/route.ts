import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// NOTE: Removed in-memory cache to prevent serving stale data
// Instagram API data should always be fetched fresh

interface InstagramMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  totalImpressions: number;
  posts: Array<{
    id: string;
    caption?: string;
    media_type: string;
    media_product_type?: string;
    media_url?: string;
    permalink?: string;
    timestamp: string;
    likes: number;
    comments: number;
    saves: number;
    reach: number;
    total_interactions: number;
    plays: number;
    impressions: number;
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

    console.log('[Instagram Analytics] ========== NEW REQUEST ==========');
    console.log('[Instagram Analytics] User ID:', user.id);

    // Get date range from query params (default to last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get Instagram accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true);

    console.log('[Instagram Analytics] Query:', { user_id: user.id, platform: 'instagram', is_active: true });
    console.log('[Instagram Analytics] Found accounts:', accounts?.length || 0);
    if (accounts && accounts.length > 0) {
      accounts.forEach(acc => {
        console.log(`[Instagram Analytics] Account: ${acc.id} - ${acc.username} - token: ${acc.access_token?.substring(0, 15)}...`);
      });
    }

    if (accountsError || !accounts || accounts.length === 0) {
      console.log('[Instagram Analytics] No active Instagram accounts found');
      return NextResponse.json({
        metrics: {
          totalPosts: 0,
          totalEngagement: 0,
          totalReach: 0,
          posts: []
        }
      });
    }

    const allMetrics: InstagramMetrics = {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalImpressions: 0,
      posts: []
    };

    // Fetch data for each Instagram account
    for (const account of accounts) {
      if (!account.access_token) continue;

      try {
        // Get Instagram media using graph.instagram.com (not graph.facebook.com!)
        // Request media_product_type to distinguish between VIDEO and REELS
        const mediaUrl = `https://graph.instagram.com/${account.platform_user_id}/media?fields=id,caption,media_type,media_product_type,media_url,permalink,timestamp,like_count,comments_count&limit=100&access_token=${account.access_token}`;
        console.log('[Instagram Analytics] Fetching media for account:', account.username || account.platform_user_id);
        console.log('[Instagram Analytics] Using URL:', mediaUrl.replace(account.access_token, 'TOKEN_HIDDEN'));
        
        const mediaResponse = await fetch(mediaUrl);
        
        if (!mediaResponse.ok) {
          const errorText = await mediaResponse.text();
          console.error(`[Instagram Analytics] Failed to fetch media for account ${account.id}:`, errorText);
          
          // Check if token is expired - but don't deactivate immediately
          // Token might be temporarily invalid due to Instagram API issues
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.code === 190) {
              console.log('[Instagram Analytics] Token error for account:', account.id);
              console.log('[Instagram Analytics] Error details:', errorData.error);
              // Don't deactivate - let user reconnect manually if needed
              // Deactivating automatically causes accounts to disappear unexpectedly
            }
          } catch (e) {
            // Error parsing error response
          }

          continue;
        }

        const mediaData = await mediaResponse.json();
        console.log('[Instagram Analytics] Found posts:', mediaData.data?.length || 0);

        // Log post dates for debugging
        if (mediaData.data && mediaData.data.length > 0) {
          console.log('[Instagram Analytics] Post dates:');
          mediaData.data.forEach((media: any, idx: number) => {
            const postDate = new Date(media.timestamp);
            console.log(`  Post ${idx + 1}: ${postDate.toISOString()} (${media.caption?.substring(0, 30) || 'No caption'}...)`);
          });
          console.log('[Instagram Analytics] Date filter cutoff:', since.toISOString());
        }

        // Filter posts by date
        const postsInDateRange = (mediaData.data || []).filter((media: any) => {
          const postDate = new Date(media.timestamp);
          return postDate >= since;
        });

        console.log('[Instagram Analytics] Posts in date range (last', days, 'days):', postsInDateRange.length);

        // Process all posts with full insights regardless of date range
        for (const media of postsInDateRange) {
            let saves = 0, reach = 0, total_interactions = 0, plays = 0;

            // Try to get insights for all posts (impressions deprecated April 2025)
            // Note: Instagram API metrics support:
            // - REELS: Support 'plays' metric (views)
            // - Regular VIDEO posts: Support 'plays' metric (views)
            // - FEED (images): Do NOT support 'plays' metric
            // Reference: GET /{ig-media-id}/insights?metric=plays,reach,likes,comments,shares,saves,total_interactions
            try {
              // Determine metrics to fetch based on media type
              // Request 'plays' (views) for all videos including Reels
              const isVideoOrReel = media.media_type === 'VIDEO' || media.media_product_type === 'REELS';

              // Videos and Reels support 'plays' metric (this is "views")
              // Images (FEED) do not support 'plays'
              const metrics = isVideoOrReel
                ? 'reach,saved,total_interactions,plays'  // Videos and Reels support 'plays' (views)
                : 'reach,saved,total_interactions';       // Images don't support 'plays'

              // Add cache-busting timestamp to ensure fresh data from Instagram API
              const cacheBust = Date.now();
              const insightsUrl = `https://graph.instagram.com/${media.id}/insights?metric=${metrics}&access_token=${account.access_token}&_=${cacheBust}`;
              console.log(`[Instagram Analytics] Fetching insights for media ${media.id} (type: ${media.media_type}, product: ${media.media_product_type || 'N/A'})`);
              console.log(`[Instagram Analytics] Requesting metrics: ${metrics}`);

              const insightsResponse = await fetch(insightsUrl);

              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();

                if (insightsData.data && Array.isArray(insightsData.data)) {
                  insightsData.data.forEach((metric: any) => {
                    if (metric.name === 'reach' && metric.values?.[0]) {
                      reach = metric.values[0].value || 0;
                      console.log(`[Instagram Analytics] ✓ Reach for ${media.id}: ${reach}`);
                    }
                    if (metric.name === 'saved' && metric.values?.[0]) {
                      saves = metric.values[0].value || 0;
                    }
                    if (metric.name === 'total_interactions' && metric.values?.[0]) {
                      total_interactions = metric.values[0].value || 0;
                    }
                    if (metric.name === 'plays' && metric.values?.[0]) {
                      plays = metric.values[0].value || 0;
                      console.log(`[Instagram Analytics] ✓ Plays for ${media.id}: ${plays}`);
                    }
                  });
                }

                console.log(`[Instagram Analytics] ✓ Final metrics for ${media.id}: reach=${reach}, plays=${plays}, saves=${saves}, interactions=${total_interactions}`);
              } else {
                const errorText = await insightsResponse.text();
                console.error(`[Instagram Analytics] ✗ Insights API failed for media ${media.id} (${media.media_type}):`);
                console.error(`[Instagram Analytics]   Status: ${insightsResponse.status} ${insightsResponse.statusText}`);
                console.error(`[Instagram Analytics]   Error: ${errorText}`);

                // Try to parse error details
                try {
                  const errorData = JSON.parse(errorText);
                  if (errorData.error) {
                    console.error(`[Instagram Analytics]   Error code: ${errorData.error.code}`);
                    console.error(`[Instagram Analytics]   Error message: ${errorData.error.message}`);
                    console.error(`[Instagram Analytics]   Error type: ${errorData.error.type}`);
                  }
                } catch (e) {
                  // Error response not JSON
                }
              }
            } catch (insightsError: any) {
              console.error(`[Instagram Analytics] ✗ Exception fetching insights for media ${media.id}:`, insightsError.message);
              console.error(`[Instagram Analytics]   Full error:`, insightsError);
            }

            const postMetrics = {
              id: media.id,
              caption: media.caption,
              media_type: media.media_type,
              media_product_type: media.media_product_type,
              media_url: media.media_url,
              permalink: media.permalink,
              timestamp: media.timestamp,
              likes: media.like_count || 0,
              comments: media.comments_count || 0,
              saves,
              reach,
              total_interactions,
              plays, // Video views (for Reels and regular videos)
              impressions: plays || reach // Use plays (views) as impressions, fallback to reach for images
            };

            allMetrics.posts.push(postMetrics);
            allMetrics.totalPosts++;
            allMetrics.totalEngagement += postMetrics.likes + postMetrics.comments + postMetrics.saves;
            allMetrics.totalReach += reach;
            allMetrics.totalImpressions += (plays || reach); // Use plays (views) as impressions, fallback to reach

            // Log summary for this post
            console.log(`[Instagram Analytics] Post summary for ${media.id}:`);
            console.log(`  - Media type: ${media.media_type}, Product type: ${media.media_product_type || 'N/A'}`);
            console.log(`  - Likes: ${postMetrics.likes}, Comments: ${postMetrics.comments}, Saves: ${saves}`);
            console.log(`  - Reach: ${reach}, Plays (Views): ${plays}, Impressions: ${plays || reach}`);
            console.log(`  - Caption: ${media.caption?.substring(0, 50) || 'No caption'}...`);
          }
      } catch (error: any) {
        console.error(`Error fetching data for Instagram account ${account.id}:`, error);
        // Note: Removed cache fallback to ensure always-fresh data
      }
    }

    console.log('[Instagram Analytics] ========== FINAL METRICS ==========');
    console.log('[Instagram Analytics] Total Posts:', allMetrics.totalPosts);
    console.log('[Instagram Analytics] Total Engagement:', allMetrics.totalEngagement);
    console.log('[Instagram Analytics] Total Reach:', allMetrics.totalReach);
    console.log('[Instagram Analytics] Total Impressions:', allMetrics.totalImpressions);
    console.log('[Instagram Analytics] Posts array length:', allMetrics.posts.length);

    // Return with cache-control headers to prevent stale data
    return NextResponse.json({ metrics: allMetrics }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error fetching Instagram analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram analytics' },
      { status: 500 }
    );
  }
}
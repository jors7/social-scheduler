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

    // Fetch data for each Pinterest account
    for (const account of accounts) {
      if (!account.access_token) continue;

      try {
        // Get user's pins using Pinterest API v5
        console.log('[Pinterest Analytics] Fetching pins for account:', account.username || account.platform_user_id);

        const pinsUrl = `https://api.pinterest.com/v5/pins?page_size=100&pin_fields=id,title,description,link,created_at,board_id,media`;
        const pinsResponse = await fetch(pinsUrl, {
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json',
          }
        });

        if (!pinsResponse.ok) {
          const errorText = await pinsResponse.text();
          console.error(`[Pinterest Analytics] Failed to fetch pins:`, errorText);
          continue;
        }

        const pinsData = await pinsResponse.json();
        const allPins = pinsData.items || [];

        console.log(`[Pinterest Analytics] Found ${allPins.length} total pins`);

        // Filter pins by date range
        const pinsInDateRange = allPins.filter((pin: any) => {
          if (!pin.created_at) return false;
          const pinDate = new Date(pin.created_at);
          return pinDate >= since;
        });

        console.log(`[Pinterest Analytics] Pins in date range (last ${days} days): ${pinsInDateRange.length}/${allPins.length}`);

        // Process all pins with full analytics regardless of date range
        const pinPromises = pinsInDateRange.map(async (pin: any) => {
          try {
            let saves = 0, pin_clicks = 0, impressions = 0, outbound_clicks = 0;

            // Get analytics for each pin
            // Pinterest Analytics API requires specific date ranges and metrics
            try {
              const analyticsUrl = `https://api.pinterest.com/v5/pins/${pin.id}/analytics?start_date=${since.toISOString().split('T')[0]}&end_date=${new Date().toISOString().split('T')[0]}&metric_types=PIN_CLICK,IMPRESSION,SAVE,OUTBOUND_CLICK`;
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
                console.log(`[Pinterest Analytics] Analytics not available for pin ${pin.id}`);
              }
            } catch (analyticsError) {
              console.log(`[Pinterest Analytics] Error fetching analytics for pin ${pin.id}:`, analyticsError);
            }

            return {
              id: pin.id,
              title: pin.title,
              description: pin.description,
              link: pin.link,
              created_at: pin.created_at,
              board_id: pin.board_id,
              media_url: pin.media?.images?.['600x']?.url || pin.media?.images?.originals?.url,
              thumbnail_url: pin.media?.images?.['236x']?.url || pin.media?.images?.['400x600']?.url,
              saves,
              pin_clicks,
              impressions,
              outbound_clicks,
              totalEngagement: saves + pin_clicks + outbound_clicks
            };
          } catch (error) {
            console.error(`[Pinterest Analytics] Error processing pin ${pin.id}:`, error);
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

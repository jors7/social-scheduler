/**
 * LinkedIn Member Analytics API Endpoint
 *
 * ⚠️ PENDING APPROVAL - This endpoint is ready but not yet active
 * Requires LinkedIn Community Management API approval before use
 *
 * @status INACTIVE - Awaiting LinkedIn API approval
 * @see docs/LINKEDIN_API_SETUP.md for activation instructions
 *
 * Once approved:
 * 1. Uncomment OAuth scopes in app/api/auth/linkedin/route.ts
 * 2. Users reconnect their LinkedIn accounts
 * 3. This endpoint will automatically start working
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LinkedInAnalyticsService, MetricType } from '@/lib/linkedin/analytics-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'overview'; // overview | post | aggregated
    const postUrn = searchParams.get('postUrn'); // For single post analytics
    const accountId = searchParams.get('accountId');
    const metricType = searchParams.get('metricType') as MetricType | null;

    // Get LinkedIn account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'linkedin')
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await query;

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'LinkedIn account not connected' },
        { status: 404 }
      );
    }

    const account = accounts[0];

    // Check if we have an access token
    if (!account.access_token) {
      return NextResponse.json(
        { error: 'LinkedIn account not properly authenticated. Please reconnect.' },
        { status: 400 }
      );
    }

    // Initialize analytics service
    const analyticsService = new LinkedInAnalyticsService({
      accessToken: account.access_token,
      linkedinVersion: '202501' // Use latest version
    });

    // Handle different request types
    switch (type) {
      case 'post':
        // Get analytics for a specific post
        if (!postUrn) {
          return NextResponse.json(
            { error: 'postUrn parameter required for post analytics' },
            { status: 400 }
          );
        }

        try {
          const metrics = await analyticsService.getPostMetrics(postUrn);

          return NextResponse.json({
            success: true,
            postUrn,
            metrics,
            account: {
              id: account.id,
              username: account.username || account.platform_user_id,
              name: account.display_name
            }
          });
        } catch (error: any) {
          // Check if it's a permissions error
          if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
            return NextResponse.json({
              error: 'LinkedIn Analytics API access not approved',
              message: 'Your LinkedIn app needs approval for the Community Management API. Using cached/simulated data.',
              requiresApproval: true
            }, { status: 403 });
          }
          throw error;
        }

      case 'aggregated':
        // Get aggregated analytics for all posts
        try {
          const metrics: Record<MetricType, number> = {
            IMPRESSION: 0,
            MEMBERS_REACHED: 0,
            RESHARE: 0,
            REACTION: 0,
            COMMENT: 0
          };

          // Fetch each metric type
          const metricTypes: MetricType[] = ['IMPRESSION', 'MEMBERS_REACHED', 'RESHARE', 'REACTION', 'COMMENT'];

          await Promise.all(
            metricTypes.map(async (metric) => {
              try {
                const results = await analyticsService.getAggregatedMemberAnalytics({
                  queryType: metric,
                  aggregation: 'TOTAL'
                });

                if (results.length > 0) {
                  metrics[metric] = results[0].count;
                }
              } catch (error) {
                console.error(`Failed to fetch ${metric}:`, error);
              }
            })
          );

          return NextResponse.json({
            success: true,
            metrics,
            account: {
              id: account.id,
              username: account.username || account.platform_user_id,
              name: account.display_name
            }
          });
        } catch (error: any) {
          if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
            return NextResponse.json({
              error: 'LinkedIn Analytics API access not approved',
              message: 'Your LinkedIn app needs approval for the Community Management API. Using cached/simulated data.',
              requiresApproval: true
            }, { status: 403 });
          }
          throw error;
        }

      case 'overview':
      default:
        // Get overview with recent posts and aggregated stats
        try {
          // Get recent posted LinkedIn posts from database
          const { data: posts, error: postsError } = await supabase
            .from('scheduled_posts')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'posted')
            .order('posted_at', { ascending: false })
            .limit(10);

          if (postsError) {
            console.error('Error fetching posts:', postsError);
          }

          // Filter for LinkedIn posts
          const linkedinPosts = posts?.filter(post =>
            post.platforms && Array.isArray(post.platforms) &&
            post.platforms.some((p: string) => p.toLowerCase() === 'linkedin')
          ) || [];

          // Fetch aggregated metrics
          let aggregatedMetrics: Record<MetricType, number> = {
            IMPRESSION: 0,
            MEMBERS_REACHED: 0,
            RESHARE: 0,
            REACTION: 0,
            COMMENT: 0
          };

          try {
            const metricTypes: MetricType[] = ['IMPRESSION', 'MEMBERS_REACHED', 'RESHARE', 'REACTION', 'COMMENT'];

            await Promise.all(
              metricTypes.map(async (metric) => {
                try {
                  const results = await analyticsService.getAggregatedMemberAnalytics({
                    queryType: metric,
                    aggregation: 'TOTAL'
                  });

                  if (results.length > 0) {
                    aggregatedMetrics[metric] = results[0].count;
                  }
                } catch (error) {
                  console.error(`Failed to fetch ${metric}:`, error);
                }
              })
            );
          } catch (error) {
            console.error('Failed to fetch aggregated metrics:', error);
          }

          // Format recent posts
          const recentPosts = linkedinPosts.slice(0, 5).map((post: any) => {
            const linkedinResult = post.post_results?.find((r: any) => r.platform === 'linkedin');

            return {
              id: linkedinResult?.postId || post.id,
              postUrn: linkedinResult?.data?.postUrn,
              content: post.content || '',
              created_time: post.posted_at || post.scheduled_for,
              permalink_url: linkedinResult?.data?.permalink || '#',
              media_type: post.media_urls?.length > 0 ? 'IMAGE' : 'TEXT',
              media_url: post.media_urls?.[0],
              metrics: linkedinResult?.data?.metrics
            };
          });

          return NextResponse.json({
            success: true,
            overview: {
              totalPosts: linkedinPosts.length,
              aggregatedMetrics,
              recentPosts
            },
            account: {
              id: account.id,
              username: account.username || account.platform_user_id,
              name: account.display_name
            }
          });
        } catch (error: any) {
          if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
            // Return partial data with simulated metrics
            return NextResponse.json({
              success: false,
              error: 'LinkedIn Analytics API access not approved',
              message: 'Apply for Community Management API access in the LinkedIn Developer Portal',
              requiresApproval: true,
              account: {
                id: account.id,
                username: account.username || account.platform_user_id,
                name: account.display_name
              }
            }, { status: 403 });
          }
          throw error;
        }
    }
  } catch (error) {
    console.error('Error fetching LinkedIn member analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch LinkedIn analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to validate analytics access
 * Checks if the connected LinkedIn account has proper analytics permissions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId } = body;

    // Get LinkedIn account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'linkedin')
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await query;

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'LinkedIn account not connected' },
        { status: 404 }
      );
    }

    const account = accounts[0];

    if (!account.access_token) {
      return NextResponse.json(
        { error: 'LinkedIn account not properly authenticated' },
        { status: 400 }
      );
    }

    // Initialize analytics service and validate access
    const analyticsService = new LinkedInAnalyticsService({
      accessToken: account.access_token,
      linkedinVersion: '202501'
    });

    const accessStatus = await analyticsService.validateAnalyticsAccess();

    return NextResponse.json({
      success: true,
      accessStatus,
      account: {
        id: account.id,
        username: account.username || account.platform_user_id,
        name: account.display_name
      }
    });
  } catch (error) {
    console.error('Error validating LinkedIn analytics access:', error);
    return NextResponse.json(
      {
        error: 'Failed to validate analytics access',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

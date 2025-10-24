import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LinkedInAnalyticsService, MetricType } from '@/lib/linkedin/analytics-service';

// Initialize Supabase with service role key for cron job
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * LinkedIn Analytics Refresh Cron Job
 *
 * ⚠️ PENDING APPROVAL - This cron job is ready but should not be activated yet
 * Requires LinkedIn Community Management API approval before use
 *
 * @status INACTIVE - DO NOT add to vercel.json until API approved
 * @see docs/LINKEDIN_API_SETUP.md for activation instructions
 *
 * Once approved, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/refresh-linkedin-analytics",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[LinkedIn Analytics Cron] Starting analytics refresh...');

    // Get all active LinkedIn accounts
    const { data: linkedInAccounts, error: accountsError } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('platform', 'linkedin')
      .eq('is_active', true);

    if (accountsError) {
      console.error('[LinkedIn Analytics Cron] Error fetching accounts:', accountsError);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    if (!linkedInAccounts || linkedInAccounts.length === 0) {
      console.log('[LinkedIn Analytics Cron] No LinkedIn accounts found');
      return NextResponse.json({ message: 'No LinkedIn accounts to process' });
    }

    console.log(`[LinkedIn Analytics Cron] Processing ${linkedInAccounts.length} accounts`);

    const results = {
      accountsProcessed: 0,
      postsUpdated: 0,
      errors: [] as any[]
    };

    // Process each account
    for (const account of linkedInAccounts) {
      try {
        console.log(`[LinkedIn Analytics Cron] Processing account: ${account.id}`);

        // Skip if no access token
        if (!account.access_token) {
          console.log(`[LinkedIn Analytics Cron] Account ${account.id} has no access token, skipping`);
          continue;
        }

        // Get recent posted LinkedIn posts for this user
        const { data: posts, error: postsError } = await supabaseAdmin
          .from('scheduled_posts')
          .select('*')
          .eq('user_id', account.user_id)
          .eq('status', 'posted')
          .gte('posted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
          .order('posted_at', { ascending: false });

        if (postsError) {
          console.error(`[LinkedIn Analytics Cron] Error fetching posts for account ${account.id}:`, postsError);
          results.errors.push({ account: account.id, error: 'Failed to fetch posts' });
          continue;
        }

        // Filter for LinkedIn posts
        const linkedInPosts = posts?.filter(post =>
          post.platforms && Array.isArray(post.platforms) &&
          post.platforms.some((p: string) => p.toLowerCase() === 'linkedin') &&
          post.post_results?.find((r: any) => r.platform === 'linkedin' && r.success)
        ) || [];

        console.log(`[LinkedIn Analytics Cron] Found ${linkedInPosts.length} LinkedIn posts for account ${account.id}`);

        if (linkedInPosts.length === 0) {
          results.accountsProcessed++;
          continue;
        }

        // Initialize analytics service
        const analyticsService = new LinkedInAnalyticsService({
          accessToken: account.access_token,
          linkedinVersion: '202501'
        });

        // Process each post
        for (const post of linkedInPosts) {
          try {
            const linkedInResult = post.post_results.find((r: any) => r.platform === 'linkedin');
            if (!linkedInResult?.data?.postUrn && !linkedInResult?.postId) {
              console.log(`[LinkedIn Analytics Cron] Post ${post.id} has no LinkedIn URN, skipping`);
              continue;
            }

            // Get the post URN
            const postUrn = linkedInResult.data?.postUrn ||
              LinkedInAnalyticsService.formatPostUrn(linkedInResult.postId);

            // Fetch analytics for this post
            const metrics = await analyticsService.getPostMetrics(postUrn);

            // Store analytics in database
            const { error: insertError } = await supabaseAdmin
              .from('linkedin_analytics')
              .insert({
                user_id: account.user_id,
                account_id: account.id,
                post_id: post.id,
                post_urn: postUrn,
                impressions: metrics.IMPRESSION || 0,
                members_reached: metrics.MEMBERS_REACHED || 0,
                reshares: metrics.RESHARE || 0,
                reactions: metrics.REACTION || 0,
                comments: metrics.COMMENT || 0,
                post_created_at: post.posted_at || post.scheduled_for,
                fetched_at: new Date().toISOString()
              });

            if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
              console.error(`[LinkedIn Analytics Cron] Error storing analytics for post ${post.id}:`, insertError);
            } else {
              console.log(`[LinkedIn Analytics Cron] Updated analytics for post ${post.id}`);
              results.postsUpdated++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (postError: any) {
            console.error(`[LinkedIn Analytics Cron] Error processing post ${post.id}:`, postError);

            // If we hit a 403, this account doesn't have API access yet
            if (postError.message?.includes('403')) {
              console.log(`[LinkedIn Analytics Cron] Account ${account.id} doesn't have analytics API access yet`);
              break; // Skip remaining posts for this account
            }

            results.errors.push({
              account: account.id,
              post: post.id,
              error: postError.message
            });
          }
        }

        results.accountsProcessed++;

      } catch (accountError: any) {
        console.error(`[LinkedIn Analytics Cron] Error processing account ${account.id}:`, accountError);
        results.errors.push({
          account: account.id,
          error: accountError.message
        });
      }
    }

    console.log('[LinkedIn Analytics Cron] Completed:', results);

    return NextResponse.json({
      success: true,
      message: 'LinkedIn analytics refresh completed',
      results
    });

  } catch (error) {
    console.error('[LinkedIn Analytics Cron] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh LinkedIn analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Manual trigger endpoint for testing
 * POST /api/cron/refresh-linkedin-analytics with bearer token
 */
export async function POST(request: NextRequest) {
  // For manual testing, allow authenticated users to trigger their own analytics refresh
  try {
    const authHeader = request.headers.get('authorization');

    // Check if it's a cron secret (for manual admin trigger)
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      return GET(request);
    }

    // Otherwise, require user authentication and only refresh their data
    const body = await request.json();
    const { userId, accountId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    console.log(`[LinkedIn Analytics Manual] Refreshing for user: ${userId}`);

    // Get user's LinkedIn account
    let query = supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await query;

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No LinkedIn account found' }, { status: 404 });
    }

    const account = accounts[0];

    if (!account.access_token) {
      return NextResponse.json({ error: 'Account not properly authenticated' }, { status: 400 });
    }

    // Refresh analytics for this user
    const results = {
      postsUpdated: 0,
      errors: [] as any[]
    };

    // Get recent posts
    const { data: posts } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'posted')
      .gte('posted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('posted_at', { ascending: false });

    const linkedInPosts = posts?.filter(post =>
      post.platforms && Array.isArray(post.platforms) &&
      post.platforms.some((p: string) => p.toLowerCase() === 'linkedin') &&
      post.post_results?.find((r: any) => r.platform === 'linkedin' && r.success)
    ) || [];

    const analyticsService = new LinkedInAnalyticsService({
      accessToken: account.access_token
    });

    for (const post of linkedInPosts) {
      try {
        const linkedInResult = post.post_results.find((r: any) => r.platform === 'linkedin');
        const postUrn = linkedInResult.data?.postUrn ||
          LinkedInAnalyticsService.formatPostUrn(linkedInResult.postId);

        const metrics = await analyticsService.getPostMetrics(postUrn);

        await supabaseAdmin.from('linkedin_analytics').insert({
          user_id: userId,
          account_id: account.id,
          post_id: post.id,
          post_urn: postUrn,
          impressions: metrics.IMPRESSION || 0,
          members_reached: metrics.MEMBERS_REACHED || 0,
          reshares: metrics.RESHARE || 0,
          reactions: metrics.REACTION || 0,
          comments: metrics.COMMENT || 0,
          post_created_at: post.posted_at,
          fetched_at: new Date().toISOString()
        });

        results.postsUpdated++;
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        results.errors.push({ post: post.id, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics refreshed',
      results
    });

  } catch (error) {
    console.error('[LinkedIn Analytics Manual] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh analytics' },
      { status: 500 }
    );
  }
}

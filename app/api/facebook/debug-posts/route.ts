import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Debug endpoint to diagnose missing Facebook posts
 * Tests different endpoints and parameters to find viral posts
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const postId = searchParams.get('postId'); // Optional: test specific post

    // Get Facebook account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook')
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await query;

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'Facebook account not connected' }, { status: 404 });
    }

    const account = accounts[0];
    const results: any = {
      account: {
        id: account.id,
        username: account.username,
        platform_user_id: account.platform_user_id
      },
      tests: {}
    };

    // If specific post ID provided, test that post directly
    if (postId) {
      console.log(`[Debug] Testing specific post: ${postId}`);

      // Test 1: Can we fetch the post directly?
      try {
        const postUrl = `https://graph.facebook.com/v21.0/${postId}?fields=id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${account.access_token}`;
        const response = await fetch(postUrl);
        const data = await response.json();

        results.tests.directPostFetch = {
          success: response.ok,
          status: response.status,
          data: response.ok ? {
            id: data.id,
            message: data.message?.substring(0, 100),
            created_time: data.created_time,
            likes: data.likes?.summary?.total_count,
            comments: data.comments?.summary?.total_count,
            shares: data.shares?.count
          } : data.error
        };
      } catch (error: any) {
        results.tests.directPostFetch = { error: error.message };
      }

      // Test 2: Can we fetch insights for this post?
      try {
        const insightsUrl = `https://graph.facebook.com/v21.0/${postId}/insights?metric=post_media_view&access_token=${account.access_token}`;
        const response = await fetch(insightsUrl);
        const data = await response.json();

        results.tests.postInsights = {
          success: response.ok,
          status: response.status,
          data: response.ok ? data : data.error
        };
      } catch (error: any) {
        results.tests.postInsights = { error: error.message };
      }

      return NextResponse.json(results);
    }

    // Test different endpoints and parameters
    const since30Days = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const since90Days = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);

    // Test 1: /posts endpoint (current implementation) - 30 days
    try {
      const url = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,likes.summary(true)&limit=100&since=${since30Days}&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();

      results.tests.posts30Days = {
        success: response.ok,
        count: data.data?.length || 0,
        hasNextPage: !!data.paging?.next,
        samplePosts: data.data?.slice(0, 3).map((p: any) => ({
          id: p.id,
          message: p.message?.substring(0, 50),
          created_time: p.created_time,
          likes: p.likes?.summary?.total_count
        }))
      };
    } catch (error: any) {
      results.tests.posts30Days = { error: error.message };
    }

    // Test 2: /posts endpoint - 90 days (to catch older viral posts)
    try {
      const url = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,likes.summary(true)&limit=100&since=${since90Days}&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();

      results.tests.posts90Days = {
        success: response.ok,
        count: data.data?.length || 0,
        hasNextPage: !!data.paging?.next,
        samplePosts: data.data?.slice(0, 3).map((p: any) => ({
          id: p.id,
          message: p.message?.substring(0, 50),
          created_time: p.created_time,
          likes: p.likes?.summary?.total_count
        }))
      };
    } catch (error: any) {
      results.tests.posts90Days = { error: error.message };
    }

    // Test 3: /feed endpoint (might return different posts)
    try {
      const url = `https://graph.facebook.com/v21.0/${account.platform_user_id}/feed?fields=id,message,created_time,likes.summary(true)&limit=100&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();

      results.tests.feed = {
        success: response.ok,
        count: data.data?.length || 0,
        hasNextPage: !!data.paging?.next,
        samplePosts: data.data?.slice(0, 3).map((p: any) => ({
          id: p.id,
          message: p.message?.substring(0, 50),
          created_time: p.created_time,
          likes: p.likes?.summary?.total_count
        }))
      };
    } catch (error: any) {
      results.tests.feed = { error: error.message };
    }

    // Test 4: /published_posts endpoint
    try {
      const url = `https://graph.facebook.com/v21.0/${account.platform_user_id}/published_posts?fields=id,message,created_time,likes.summary(true)&limit=100&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();

      results.tests.publishedPosts = {
        success: response.ok,
        count: data.data?.length || 0,
        hasNextPage: !!data.paging?.next,
        error: !response.ok ? data.error : undefined,
        samplePosts: data.data?.slice(0, 3).map((p: any) => ({
          id: p.id,
          message: p.message?.substring(0, 50),
          created_time: p.created_time,
          likes: p.likes?.summary?.total_count
        }))
      };
    } catch (error: any) {
      results.tests.publishedPosts = { error: error.message };
    }

    // Test 5: /photos endpoint (for image posts specifically)
    try {
      const url = `https://graph.facebook.com/v21.0/${account.platform_user_id}/photos?type=uploaded&fields=id,name,created_time,likes.summary(true)&limit=100&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();

      // Sort by likes to find potentially viral photos
      const sortedByLikes = (data.data || []).sort((a: any, b: any) =>
        (b.likes?.summary?.total_count || 0) - (a.likes?.summary?.total_count || 0)
      );

      results.tests.photos = {
        success: response.ok,
        count: data.data?.length || 0,
        hasNextPage: !!data.paging?.next,
        topByLikes: sortedByLikes.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.name?.substring(0, 50),
          created_time: p.created_time,
          likes: p.likes?.summary?.total_count
        }))
      };
    } catch (error: any) {
      results.tests.photos = { error: error.message };
    }

    // Test 6: Fetch ALL posts and look for specific viral post ID
    // The viral post we found has ID: 102939582100461_831855669562989
    try {
      const url = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time&limit=100&since=${since30Days}&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();

      const allPostIds = (data.data || []).map((p: any) => p.id);
      const viralPostId = '102939582100461_831855669562989';
      const foundViralPost = allPostIds.includes(viralPostId);

      // Also search by partial ID
      const partialMatch = allPostIds.find((id: string) => id.includes('831855669562989'));

      results.tests.searchForViralPost = {
        totalPostsFetched: allPostIds.length,
        searchingFor: viralPostId,
        found: foundViralPost,
        partialMatch: partialMatch || null,
        // Show some post IDs to compare
        sampleIds: allPostIds.slice(0, 10),
        // Check ID ranges - are viral post IDs in range?
        idRange: {
          lowestId: allPostIds[allPostIds.length - 1],
          highestId: allPostIds[0]
        }
      };
    } catch (error: any) {
      results.tests.searchForViralPost = { error: error.message };
    }

    // Test 7: Try fetching the viral post directly by its numeric ID and get insights
    try {
      const viralPostId = '102939582100461_831855669562989';

      // First, can we get basic info? (without likes since that fails)
      const basicUrl = `https://graph.facebook.com/v21.0/${viralPostId}?fields=id,message,created_time,permalink_url,shares&access_token=${account.access_token}`;
      const basicResponse = await fetch(basicUrl);
      const basicData = await basicResponse.json();

      // Then get insights
      const insightsUrl = `https://graph.facebook.com/v21.0/${viralPostId}/insights?metric=post_media_view&access_token=${account.access_token}`;
      const insightsResponse = await fetch(insightsUrl);
      const insightsData = await insightsResponse.json();

      results.tests.viralPostDirect = {
        basicInfo: {
          success: basicResponse.ok,
          data: basicResponse.ok ? basicData : basicData.error
        },
        insights: {
          success: insightsResponse.ok,
          views: insightsData.data?.[0]?.values?.[0]?.value || 0,
          raw: insightsResponse.ok ? insightsData : insightsData.error
        }
      };
    } catch (error: any) {
      results.tests.viralPostDirect = { error: error.message };
    }

    // Summary
    results.summary = {
      totalPostsIn30Days: results.tests.posts30Days?.count || 0,
      viralPostFound: results.tests.searchForViralPost?.found || false,
      viralPostViews: results.tests.viralPostDirect?.insights?.views || 0,
      issue: results.tests.searchForViralPost?.found === false
        ? "VIRAL POST NOT IN /posts ENDPOINT - Facebook API doesn't return it!"
        : "Viral post found in /posts endpoint"
    };

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

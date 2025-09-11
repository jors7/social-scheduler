import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get LinkedIn account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'linkedin')
      .eq('is_active', true);
    
    // If specific account requested, get that one
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
    
    // Use specified account or first available
    const account = accounts[0];

    // Note: LinkedIn API requires special permissions for fetching posts
    // For now, we'll fetch from our database and simulate metrics
    // In production, you would use: https://api.linkedin.com/v2/ugcPosts

    // Get recent posted LinkedIn posts from database
    const { data: posts, error: postsError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'posted')
      .order('posted_at', { ascending: false })
      .limit(limit);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Filter for LinkedIn posts and extract metrics
    const linkedinPosts = posts?.filter(post => 
      post.platforms && Array.isArray(post.platforms) && 
      post.platforms.some((p: string) => p.toLowerCase() === 'linkedin')
    ) || [];

    // Process posts to match expected format
    const media = linkedinPosts.map((post: any) => {
      // Find LinkedIn result in post_results
      const linkedinResult = post.post_results?.find((r: any) => r.platform === 'linkedin');
      
      // Extract metrics from stored data or use defaults
      const metrics = linkedinResult?.data?.metrics || {
        views: Math.floor(Math.random() * 1000), // Simulated for demo
        likes: Math.floor(Math.random() * 50),
        comments: Math.floor(Math.random() * 20),
        shares: Math.floor(Math.random() * 10),
        clicks: Math.floor(Math.random() * 100),
        impressions: Math.floor(Math.random() * 1500)
      };

      return {
        id: linkedinResult?.postId || post.id,
        text: post.content || '',
        created_time: post.posted_at || post.scheduled_for,
        permalink_url: linkedinResult?.data?.permalink || '#',
        media_type: post.media_urls?.length > 0 ? 'IMAGE' : 'TEXT',
        media_url: post.media_urls?.[0],
        metrics
      };
    }).slice(0, limit);

    return NextResponse.json({
      success: true,
      media,
      account: {
        id: account.id,
        username: account.username || account.platform_user_id,
        name: account.display_name
      },
      note: 'LinkedIn API requires special permissions. Using cached data with simulated metrics.'
    });
    
  } catch (error) {
    console.error('Error in LinkedIn posts endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LinkedIn posts' },
      { status: 500 }
    );
  }
}
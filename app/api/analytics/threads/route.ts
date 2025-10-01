import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper to add timeout to fetch requests
async function fetchWithTimeout(url: string, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

interface ThreadsMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  totalViews: number;
  posts: Array<{
    id: string;
    text?: string;
    permalink?: string;
    timestamp: string;
    media_type?: string;
    media_url?: string;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
    views: number;
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
    const limit = parseInt(searchParams.get('limit') || '50');

    // Calculate date cutoff for filtering
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get Threads accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .eq('is_active', true);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json({ 
        metrics: {
          totalPosts: 0,
          totalEngagement: 0,
          totalReach: 0,
          totalViews: 0,
          posts: []
        }
      });
    }

    const allMetrics: ThreadsMetrics = {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalViews: 0,
      posts: []
    };

    // Fetch data for each Threads account
    for (const account of accounts) {
      if (!account.access_token) continue;

      try {
        // Get Threads posts
        const threadsUrl = `https://graph.threads.net/v1.0/me/threads?fields=id,text,permalink,timestamp,media_type,media_url&limit=${limit}&access_token=${account.access_token}`;
        const threadsResponse = await fetchWithTimeout(threadsUrl, 10000); // 10 second timeout
        
        if (!threadsResponse.ok) {
          console.error(`Failed to fetch Threads posts for account ${account.id}`);
          continue;
        }

        const threadsData = await threadsResponse.json();
        const allPosts = threadsData.data || [];

        // Filter posts by date range
        const postsInDateRange = allPosts.filter((post: any) => {
          const postDate = new Date(post.timestamp);
          return postDate >= since;
        });

        console.log(`[Threads Analytics] Found ${allPosts.length} total posts`);
        console.log(`[Threads Analytics] Posts in date range (last ${days} days): ${postsInDateRange.length}/${allPosts.length}`);

        // Process all posts with full insights regardless of date range
        const postPromises = postsInDateRange.map(async (post: any) => {
            try {
              let likes = 0, replies = 0, reposts = 0, quotes = 0, views = 0;
              
              // Get insights for all posts in 7-day range
              try {
                const insightsUrl = `https://graph.threads.net/v1.0/${post.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${account.access_token}`;
                const insightsResponse = await fetchWithTimeout(insightsUrl, 3000);
                
                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  if (insightsData.data && Array.isArray(insightsData.data)) {
                    insightsData.data.forEach((metric: any) => {
                      if (metric.name && metric.values?.[0]) {
                        const value = metric.values[0].value || 0;
                        switch(metric.name) {
                          case 'views': views = value; break;
                          case 'likes': likes = value; break;
                          case 'replies': replies = value; break;
                          case 'reposts': reposts = value; break;
                          case 'quotes': quotes = value; break;
                        }
                      }
                    });
                  }
                } else {
                  console.log(`Insights not available for Threads post ${post.id}`);
                }
              } catch (insightsError) {
                console.log(`Error fetching insights for post ${post.id}:`, insightsError);
              }
              
              return {
                id: post.id,
                text: post.text,
                permalink: post.permalink,
                timestamp: post.timestamp,
                media_type: post.media_type,
                media_url: post.media_url,
                likes,
                replies,
                reposts,
                quotes,
                views,
                totalEngagement: likes + replies + reposts + quotes
              };
            } catch (error) {
              console.error(`Error processing post ${post.id}:`, error);
              return null;
            }
          });
          
          const postResults = await Promise.all(postPromises);
          postResults.forEach(postMetrics => {
            if (postMetrics) {
              allMetrics.posts.push(postMetrics);
              allMetrics.totalPosts++;
              allMetrics.totalEngagement += postMetrics.totalEngagement;
              allMetrics.totalReach += postMetrics.views;
              allMetrics.totalViews += postMetrics.views;
            }
          });
      } catch (error) {
        console.error(`Error fetching data for Threads account ${account.id}:`, error);
      }
    }

    return NextResponse.json({ metrics: allMetrics });

  } catch (error) {
    console.error('Error fetching Threads analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Threads analytics' },
      { status: 500 }
    );
  }
}
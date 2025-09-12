import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidThreadsToken } from '@/lib/threads/token-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const metric = searchParams.get('metric') || 'views,likes,replies,reposts,quotes,shares';
    const period = searchParams.get('period') || 'lifetime';
    const accountId = searchParams.get('accountId');
    
    // Get user from supabase
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Threads account with automatic token refresh
    const { token: accessToken, account, error: tokenError } = await getValidThreadsToken(accountId || undefined);

    if (tokenError || !accessToken) {
      console.error('Failed to get valid token:', tokenError);
      return NextResponse.json({ 
        error: tokenError || 'No Threads account connected',
        needsReconnect: tokenError?.includes('reconnect') || false
      }, { status: 404 });
    }

    // Fetch insights based on whether it's for a specific post or user
    let insightsUrl: string;
    
    if (postId) {
      // Post-specific insights
      insightsUrl = `https://graph.threads.net/v1.0/${postId}/insights?metric=${metric}&access_token=${accessToken}`;
    } else {
      // User insights
      insightsUrl = `https://graph.threads.net/v1.0/me/threads_insights?metric=${metric}&period=${period}&access_token=${accessToken}`;
    }

    console.log('Fetching Threads insights:', insightsUrl);
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();

    if (!insightsResponse.ok) {
      console.error('Failed to fetch insights:', insightsData);
      return NextResponse.json(
        { 
          error: insightsData.error?.message || 'Failed to fetch insights',
          details: insightsData.error
        },
        { status: insightsResponse.status }
      );
    }

    // Also fetch replies if requested and postId is provided
    let repliesData = null;
    if (postId && searchParams.get('includeReplies') === 'true') {
      const repliesUrl = `https://graph.threads.net/v1.0/${postId}/replies?fields=id,text,username,timestamp,like_count&access_token=${accessToken}`;
      
      console.log('Fetching post replies:', repliesUrl);
      const repliesResponse = await fetch(repliesUrl);
      
      if (repliesResponse.ok) {
        repliesData = await repliesResponse.json();
      }
    }

    // Fetch conversation thread if requested
    let conversationData = null;
    if (postId && searchParams.get('includeConversation') === 'true') {
      const conversationUrl = `https://graph.threads.net/v1.0/${postId}/conversation?fields=id,text,username,timestamp&access_token=${accessToken}`;
      
      console.log('Fetching conversation thread:', conversationUrl);
      const conversationResponse = await fetch(conversationUrl);
      
      if (conversationResponse.ok) {
        conversationData = await conversationResponse.json();
      }
    }

    return NextResponse.json({
      success: true,
      insights: insightsData,
      replies: repliesData,
      conversation: conversationData,
      postId: postId,
      metrics: metric.split(','),
      period: period
    });

  } catch (error) {
    console.error('Threads insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

// POST endpoint to hide/unhide replies (requires threads_manage_replies)
export async function POST(request: NextRequest) {
  try {
    const { replyId, action, accessToken } = await request.json();

    if (!replyId || !action || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['hide', 'unhide'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "hide" or "unhide"' },
        { status: 400 }
      );
    }

    // Manage reply visibility
    const manageUrl = `https://graph.threads.net/v1.0/${replyId}/${action}?access_token=${accessToken}`;
    
    console.log(`${action}ing reply ${replyId}`);
    const manageResponse = await fetch(manageUrl, {
      method: 'POST'
    });

    const manageData = await manageResponse.json();

    if (!manageResponse.ok) {
      console.error(`Failed to ${action} reply:`, manageData);
      return NextResponse.json(
        { 
          error: manageData.error?.message || `Failed to ${action} reply`,
          details: manageData.error
        },
        { status: manageResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      action: action,
      replyId: replyId,
      result: manageData
    });

  } catch (error) {
    console.error('Reply management error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage reply' },
      { status: 500 }
    );
  }
}
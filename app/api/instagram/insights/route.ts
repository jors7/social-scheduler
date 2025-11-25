import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InstagramClient } from '@/lib/instagram/client';

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
    const mediaId = searchParams.get('mediaId');
    const storyId = searchParams.get('storyId');
    const period = searchParams.get('period') as 'day' | 'week' | 'days_28' || 'day';
    const type = searchParams.get('type') || 'media'; // 'media', 'user', or 'story'
    const accountId = searchParams.get('accountId');
    const mediaType = searchParams.get('mediaType'); // Pass media type for proper metrics

    // Get Instagram account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true);
    
    // If specific account requested, get that one
    if (accountId) {
      query = query.eq('id', accountId);
    }
    
    const { data: accounts, error: accountError } = await query;

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Instagram account not connected' },
        { status: 404 }
      );
    }

    // Explicitly select the account
    const account = accountId
      ? accounts.find(acc => acc.id === accountId) || accounts[0]
      : accounts[0];

    if (!account) {
      return NextResponse.json(
        { error: 'Selected Instagram account not found' },
        { status: 404 }
      );
    }

    console.log(`[Instagram Insights API] Using account: ${account.username || account.platform_user_id} (ID: ${account.id})`);

    // Initialize Instagram client
    const client = new InstagramClient({
      accessToken: account.access_token,
      userID: account.platform_user_id,
      appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET,
    });

    let insights;

    switch (type) {
      case 'story':
        if (!storyId) {
          return NextResponse.json(
            { error: 'Story ID is required for story insights' },
            { status: 400 }
          );
        }
        insights = await client.getStoryInsights(storyId);
        break;
      
      case 'user':
        insights = await client.getUserInsights(period);
        break;
      
      case 'media':
      default:
        if (!mediaId) {
          return NextResponse.json(
            { error: 'Media ID is required for media insights' },
            { status: 400 }
          );
        }
        console.log(`Media type passed to insights API: ${mediaType} for media ${mediaId}`);
        insights = await client.getMediaInsights(mediaId, undefined, mediaType || undefined);
        break;
    }

    // Process insights data for easier consumption
    const processedInsights: Record<string, any> = {};
    
    if (insights.data && Array.isArray(insights.data)) {
      insights.data.forEach((metric: any) => {
        const value = metric.values?.[0]?.value || 0;
        processedInsights[metric.name] = {
          value,
          description: metric.description || metric.name,
          period: metric.period || 'lifetime',
        };
      });
    }

    return NextResponse.json({
      success: true,
      insights: processedInsights,
      raw: insights,
      type,
      id: mediaId || storyId,
      period: type === 'user' ? period : undefined,
      account: {
        id: account.id,
        username: account.username,
        platform_user_id: account.platform_user_id
      }
    });

  } catch (error) {
    console.error('Instagram insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

// Get multiple media insights in batch
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mediaIds } = await request.json();
    
    if (!mediaIds || !Array.isArray(mediaIds)) {
      return NextResponse.json(
        { error: 'mediaIds array is required' },
        { status: 400 }
      );
    }

    // Get Instagram account
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Instagram account not connected' },
        { status: 404 }
      );
    }

    // Initialize Instagram client
    const client = new InstagramClient({
      accessToken: account.access_token,
      userID: account.platform_user_id,
      appSecret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET,
    });

    // Fetch insights for all media items
    const insightsPromises = mediaIds.map(async (mediaId) => {
      try {
        const insights = await client.getMediaInsights(mediaId);
        
        const processedInsights: Record<string, any> = {};
        if (insights.data && Array.isArray(insights.data)) {
          insights.data.forEach((metric: any) => {
            const value = metric.values?.[0]?.value || 0;
            processedInsights[metric.name] = value;
          });
        }
        
        return {
          mediaId,
          success: true,
          insights: processedInsights,
        };
      } catch (error) {
        console.error(`Failed to fetch insights for ${mediaId}:`, error);
        return {
          mediaId,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch insights',
        };
      }
    });

    const results = await Promise.all(insightsPromises);

    return NextResponse.json({
      success: true,
      results,
      total: mediaIds.length,
      successful: results.filter(r => r.success).length,
    });

  } catch (error) {
    console.error('Instagram batch insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
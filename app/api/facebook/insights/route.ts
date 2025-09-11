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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'page';
    const period = searchParams.get('period') || 'day';
    const accountId = searchParams.get('accountId');

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
      return NextResponse.json(
        { error: 'Facebook account not connected' },
        { status: 404 }
      );
    }

    const account = accounts[0];

    if (type === 'page') {
      // Fetch page-level insights
      const metrics = [
        'page_impressions',
        'page_engaged_users', 
        'page_post_engagements',
        'page_fans',
        'page_views_total',
        'page_actions_post_reactions_total'
      ].join(',');

      const insightsUrl = `https://graph.facebook.com/v18.0/${account.platform_user_id}/insights?metric=${metrics}&period=${period}&access_token=${account.access_token}`;
      
      const response = await fetch(insightsUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to fetch Facebook insights:', errorData);
        return NextResponse.json(
          { error: errorData.error?.message || 'Failed to fetch insights' },
          { status: 400 }
        );
      }

      const data = await response.json();
      
      // Process insights data
      const insights: any = {};
      
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((metric: any) => {
          const latestValue = metric.values?.[metric.values.length - 1]?.value || 0;
          const previousValue = metric.values?.[metric.values.length - 2]?.value || 0;
          
          switch(metric.name) {
            case 'page_impressions':
              insights.impressions = { value: latestValue, previous: previousValue };
              break;
            case 'page_engaged_users':
              insights.engagement = { value: latestValue, previous: previousValue };
              break;
            case 'page_post_engagements':
              insights.post_engagements = { value: latestValue, previous: previousValue };
              break;
            case 'page_fans':
              insights.followers = { value: latestValue, previous: previousValue };
              break;
            case 'page_views_total':
              insights.page_views = { value: latestValue, previous: previousValue };
              break;
            case 'page_actions_post_reactions_total':
              insights.reactions = { value: latestValue, previous: previousValue };
              break;
          }
        });
      }

      // Also fetch current page info
      const pageInfoUrl = `https://graph.facebook.com/v18.0/${account.platform_user_id}?fields=fan_count,name&access_token=${account.access_token}`;
      const pageInfoResponse = await fetch(pageInfoUrl);
      
      if (pageInfoResponse.ok) {
        const pageInfo = await pageInfoResponse.json();
        insights.fan_count = { value: pageInfo.fan_count || 0, previous: 0 };
        insights.page_name = pageInfo.name;
      }

      return NextResponse.json({ 
        success: true, 
        insights,
        account: {
          id: account.id,
          username: account.username || account.platform_user_id,
          name: account.display_name
        }
      });
    }

    return NextResponse.json({ 
      error: 'Invalid type parameter' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error fetching Facebook insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook insights' },
      { status: 500 }
    );
  }
}
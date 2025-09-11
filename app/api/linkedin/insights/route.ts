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
    const type = searchParams.get('type') || 'profile';
    const period = searchParams.get('period') || 'day';
    const accountId = searchParams.get('accountId');

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

    // Note: LinkedIn Analytics API requires Marketing Developer Platform access
    // For now, we'll return simulated data
    // In production, you would use: https://api.linkedin.com/v2/organizationalEntityShareStatistics

    if (type === 'profile') {
      // Simulated profile-level insights
      const insights = {
        profile_views: { 
          value: Math.floor(Math.random() * 500) + 100,
          previous: Math.floor(Math.random() * 400) + 80
        },
        post_impressions: { 
          value: Math.floor(Math.random() * 2000) + 500,
          previous: Math.floor(Math.random() * 1800) + 400
        },
        search_appearances: { 
          value: Math.floor(Math.random() * 100) + 20,
          previous: Math.floor(Math.random() * 90) + 15
        },
        followers: { 
          value: Math.floor(Math.random() * 1000) + 500,
          previous: Math.floor(Math.random() * 950) + 480
        },
        engagement_rate: { 
          value: Math.random() * 5 + 1, // 1-6% engagement rate
          previous: Math.random() * 5 + 0.5
        },
        connections: {
          value: Math.floor(Math.random() * 500) + 200,
          previous: Math.floor(Math.random() * 490) + 195
        }
      };

      return NextResponse.json({ 
        success: true, 
        insights,
        account: {
          id: account.id,
          username: account.username || account.platform_user_id,
          name: account.display_name
        },
        note: 'LinkedIn Analytics API requires Marketing Developer Platform access. Showing simulated data.'
      });
    }

    return NextResponse.json({ 
      error: 'Invalid type parameter' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error fetching LinkedIn insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LinkedIn insights' },
      { status: 500 }
    );
  }
}
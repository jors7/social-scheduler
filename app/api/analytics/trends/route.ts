import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TrendComparison {
  current: number;
  previous: number;
  change: number;
}

interface TrendData {
  totalPosts: TrendComparison;
  totalEngagement: TrendComparison;
  totalReach: TrendComparison;
  totalImpressions: TrendComparison;
  engagementRate: TrendComparison;
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range from query params (default to last 7 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');

    // Calculate date ranges
    const today = new Date();
    const currentPeriodStart = new Date(today);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);

    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);
    const previousPeriodEnd = currentPeriodStart;

    // Fetch current period snapshot (most recent snapshot within the period)
    const { data: currentSnapshot, error: currentError } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .gte('snapshot_date', currentPeriodStart.toISOString().split('T')[0])
      .lte('snapshot_date', today.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (currentError && currentError.code !== 'PGRST116') {
      console.error('Error fetching current snapshot:', currentError);
    }

    // Fetch previous period snapshot (most recent snapshot within the previous period)
    const { data: previousSnapshot, error: previousError } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .gte('snapshot_date', previousPeriodStart.toISOString().split('T')[0])
      .lt('snapshot_date', previousPeriodEnd.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (previousError && previousError.code !== 'PGRST116') {
      console.error('Error fetching previous snapshot:', previousError);
    }

    // If we don't have enough historical data, return null (UI will handle gracefully)
    if (!currentSnapshot || !previousSnapshot) {
      return NextResponse.json({
        trends: null,
        message: 'Not enough historical data yet. Trends will appear after collecting data for multiple periods.'
      });
    }

    // Calculate trends from real historical data
    const trends: TrendData = {
      totalPosts: {
        current: currentSnapshot.total_posts || 0,
        previous: previousSnapshot.total_posts || 0,
        change: calculateChange(
          currentSnapshot.total_posts || 0,
          previousSnapshot.total_posts || 0
        )
      },
      totalEngagement: {
        current: currentSnapshot.total_engagement || 0,
        previous: previousSnapshot.total_engagement || 0,
        change: calculateChange(
          currentSnapshot.total_engagement || 0,
          previousSnapshot.total_engagement || 0
        )
      },
      totalReach: {
        current: currentSnapshot.total_reach || 0,
        previous: previousSnapshot.total_reach || 0,
        change: calculateChange(
          currentSnapshot.total_reach || 0,
          previousSnapshot.total_reach || 0
        )
      },
      totalImpressions: {
        current: currentSnapshot.total_impressions || 0,
        previous: previousSnapshot.total_impressions || 0,
        change: calculateChange(
          currentSnapshot.total_impressions || 0,
          previousSnapshot.total_impressions || 0
        )
      },
      engagementRate: {
        current: parseFloat(currentSnapshot.engagement_rate?.toString() || '0'),
        previous: parseFloat(previousSnapshot.engagement_rate?.toString() || '0'),
        change: calculateChange(
          parseFloat(currentSnapshot.engagement_rate?.toString() || '0'),
          parseFloat(previousSnapshot.engagement_rate?.toString() || '0')
        )
      }
    };

    return NextResponse.json({ trends });

  } catch (error) {
    console.error('Error calculating trends:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trends' },
      { status: 500 }
    );
  }
}

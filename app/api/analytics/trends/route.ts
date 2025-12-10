import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { daysAgoUTC, endOfDayUTC } from '@/lib/utils';

interface TrendComparison {
  current: number;
  previous: number;
  change: number | null;
}

interface TrendData {
  totalPosts: TrendComparison;
  totalEngagement: TrendComparison;
  totalReach: TrendComparison;
  totalImpressions: TrendComparison;
  engagementRate: TrendComparison;
}

function calculateChange(current: number, previous: number): number | null {
  // If both are zero, no change
  if (previous === 0 && current === 0) return 0;
  // If previous is zero but current is not, return null (no valid comparison)
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Helper function to calculate metrics from platform data
async function fetchPlatformMetrics(userId: string, startDate: Date, endDate: Date) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const platforms = ['facebook', 'instagram', 'threads', 'bluesky', 'pinterest', 'tiktok'];
  let totalPosts = 0;
  let totalEngagement = 0;
  let totalReach = 0;
  let totalImpressions = 0;

  for (const platform of platforms) {
    try {
      const response = await fetch(`${baseUrl}/api/analytics/${platform}?days=${days}`, {
        headers: {
          'x-user-id': userId,
          'x-start-date': startDate.toISOString(),
          'x-end-date': endDate.toISOString()
        }
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (!data.metrics) continue;

      // Filter posts to only those within the date range
      const postsInRange = data.metrics.posts.filter((post: any) => {
        const postDate = new Date(post.created_time || post.timestamp || post.createdAt || post.created_at);
        return postDate >= startDate && postDate <= endDate;
      });

      totalPosts += postsInRange.length;

      // Calculate metrics from posts in range
      postsInRange.forEach((post: any) => {
        // Platform-specific engagement calculation
        if (platform === 'facebook') {
          totalEngagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
          totalReach += post.reach || 0;
          totalImpressions += post.impressions || 0;
        } else if (platform === 'instagram') {
          totalEngagement += (post.likes || 0) + (post.comments || 0) + (post.saves || 0);
          totalReach += post.reach || 0;
          totalImpressions += post.impressions || post.plays || 0;
        } else if (platform === 'threads') {
          totalEngagement += (post.likes || 0) + (post.replies || 0) + (post.reposts || 0) + (post.quotes || 0);
          totalReach += post.views || 0;
          totalImpressions += post.views || 0;
        } else if (platform === 'bluesky') {
          totalEngagement += (post.likes || 0) + (post.replies || 0) + (post.reposts || 0);
          // Bluesky doesn't have reach/impressions
        } else if (platform === 'pinterest') {
          totalEngagement += (post.saves || 0) + (post.pin_clicks || 0) + (post.outbound_clicks || 0);
          totalReach += post.impressions || 0;
          totalImpressions += post.impressions || 0;
        } else if (platform === 'tiktok') {
          totalEngagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
          totalReach += post.views || 0;
          totalImpressions += post.views || 0;
        }
      });

    } catch (error) {
      console.error(`Error fetching ${platform} data for trends:`, error);
    }
  }

  return {
    totalPosts,
    totalEngagement,
    totalReach,
    totalImpressions
  };
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

    // Calculate date ranges for current and previous periods (all in UTC)
    const today = endOfDayUTC(); // End of today in UTC

    const currentPeriodStart = daysAgoUTC(days); // Start of day N days ago in UTC

    const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1); // Just before current period

    const previousPeriodStart = daysAgoUTC(days * 2); // Start of previous period in UTC

    console.log('Trend calculation periods:');
    console.log('Current:', currentPeriodStart.toISOString(), 'to', today.toISOString());
    console.log('Previous:', previousPeriodStart.toISOString(), 'to', previousPeriodEnd.toISOString());

    // Fetch metrics for both periods from real post data
    const [currentMetrics, previousMetrics] = await Promise.all([
      fetchPlatformMetrics(user.id, currentPeriodStart, today),
      fetchPlatformMetrics(user.id, previousPeriodStart, previousPeriodEnd)
    ]);

    // If no data in either period, return null
    if (currentMetrics.totalPosts === 0 && previousMetrics.totalPosts === 0) {
      return NextResponse.json({
        trends: null,
        message: 'Not enough data yet. Trends will appear after posting content.'
      });
    }

    // Calculate engagement rates
    const currentEngagementRate = currentMetrics.totalImpressions > 0
      ? (currentMetrics.totalEngagement / currentMetrics.totalImpressions) * 100
      : 0;

    const previousEngagementRate = previousMetrics.totalImpressions > 0
      ? (previousMetrics.totalEngagement / previousMetrics.totalImpressions) * 100
      : 0;

    // Calculate trends from real period data
    const trends: TrendData = {
      totalPosts: {
        current: currentMetrics.totalPosts,
        previous: previousMetrics.totalPosts,
        change: calculateChange(currentMetrics.totalPosts, previousMetrics.totalPosts)
      },
      totalEngagement: {
        current: currentMetrics.totalEngagement,
        previous: previousMetrics.totalEngagement,
        change: calculateChange(currentMetrics.totalEngagement, previousMetrics.totalEngagement)
      },
      totalReach: {
        current: currentMetrics.totalReach,
        previous: previousMetrics.totalReach,
        change: calculateChange(currentMetrics.totalReach, previousMetrics.totalReach)
      },
      totalImpressions: {
        current: currentMetrics.totalImpressions,
        previous: previousMetrics.totalImpressions,
        change: calculateChange(currentMetrics.totalImpressions, previousMetrics.totalImpressions)
      },
      engagementRate: {
        current: currentEngagementRate,
        previous: previousEngagementRate,
        change: calculateChange(currentEngagementRate, previousEngagementRate)
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

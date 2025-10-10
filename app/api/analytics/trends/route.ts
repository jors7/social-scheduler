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

    // For demo purposes, generate realistic-looking trend data
    // In production, this would fetch actual historical data from the database
    const generateDemoTrends = (days: number): TrendData => {
      // Simulate different growth patterns based on time period
      const growthFactor = days === 7 ? 1.15 : days === 30 ? 1.08 : 1.05;
      const variance = Math.random() * 0.2 - 0.1; // -10% to +10% variance

      return {
        totalPosts: {
          current: 44,
          previous: Math.floor(44 / (growthFactor + variance)),
          change: ((growthFactor + variance - 1) * 100)
        },
        totalEngagement: {
          current: 14,
          previous: Math.floor(14 / (growthFactor + variance * 0.8)),
          change: ((growthFactor + variance * 0.8 - 1) * 100)
        },
        totalReach: {
          current: 74,
          previous: Math.floor(74 / (growthFactor + variance * 1.2)),
          change: ((growthFactor + variance * 1.2 - 1) * 100)
        },
        totalImpressions: {
          current: 72,
          previous: Math.floor(72 / (growthFactor + variance * 0.9)),
          change: ((growthFactor + variance * 0.9 - 1) * 100)
        },
        engagementRate: {
          current: 18.9,
          previous: 18.9 / (growthFactor + variance * 0.5),
          change: ((growthFactor + variance * 0.5 - 1) * 100)
        }
      };
    };

    const trends = generateDemoTrends(days);

    return NextResponse.json({ trends });

  } catch (error) {
    console.error('Error calculating trends:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trends' },
      { status: 500 }
    );
  }
}

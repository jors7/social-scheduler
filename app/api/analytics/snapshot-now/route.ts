import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This endpoint allows users to manually trigger a snapshot
// Useful for testing and immediate data updates
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch current analytics from all platforms
    const platforms = ['facebook', 'instagram', 'threads', 'bluesky', 'pinterest', 'tiktok'];
    const platformData: Record<string, any> = {};

    for (const platform of platforms) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/${platform}?days=30`, {
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          }
        });

        if (response.ok) {
          platformData[platform] = await response.json();
        }
      } catch (error) {
        console.error(`Error fetching ${platform} analytics:`, error);
      }
    }

    // Calculate aggregate metrics
    let totalPosts = 0;
    let totalEngagement = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    const platformStats: Record<string, any> = {};

    for (const [platform, data] of Object.entries(platformData)) {
      if (!data) continue;

      const stats = {
        posts: data.posts?.length || 0,
        engagement: data.totalEngagement || 0,
        reach: data.totalReach || 0,
        impressions: data.totalImpressions || 0
      };

      platformStats[platform] = stats;

      totalPosts += stats.posts;
      totalEngagement += stats.engagement;
      totalReach += stats.reach;
      totalImpressions += stats.impressions;
    }

    // Calculate engagement rate
    const engagementRate = totalImpressions > 0
      ? (totalEngagement / totalImpressions) * 100
      : 0;

    const metrics = {
      user_id: user.id,
      snapshot_date: new Date().toISOString().split('T')[0],
      total_posts: totalPosts,
      total_engagement: totalEngagement,
      total_reach: totalReach,
      total_impressions: totalImpressions,
      engagement_rate: parseFloat(engagementRate.toFixed(2)),
      platform_stats: platformStats
    };

    // Check if snapshot already exists for today
    const { data: existingSnapshot } = await supabase
      .from('analytics_snapshots')
      .select('id')
      .eq('user_id', user.id)
      .eq('snapshot_date', metrics.snapshot_date)
      .single();

    if (existingSnapshot) {
      // Update existing snapshot
      const { error } = await supabase
        .from('analytics_snapshots')
        .update({
          total_posts: metrics.total_posts,
          total_engagement: metrics.total_engagement,
          total_reach: metrics.total_reach,
          total_impressions: metrics.total_impressions,
          engagement_rate: metrics.engagement_rate,
          platform_stats: metrics.platform_stats
        })
        .eq('id', existingSnapshot.id);

      if (error) {
        throw new Error(`Failed to update snapshot: ${error.message}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Snapshot updated successfully',
        metrics
      });
    } else {
      // Create new snapshot
      const { error } = await supabase
        .from('analytics_snapshots')
        .insert(metrics);

      if (error) {
        throw new Error(`Failed to create snapshot: ${error.message}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Snapshot created successfully',
        metrics
      });
    }

  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}

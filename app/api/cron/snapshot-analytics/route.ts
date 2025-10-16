import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Receiver } from '@upstash/qstash';

export const dynamic = 'force-dynamic';

// Helper function to fetch platform analytics
async function fetchPlatformAnalytics(userId: string, platform: string, days: number = 30) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/${platform}?days=${days}`, {
      headers: {
        'x-user-id': userId // Custom header for internal API calls
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${platform} analytics:`, response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${platform} analytics:`, error);
    return null;
  }
}

// Calculate aggregate analytics from all platforms
function calculateAggregateAnalytics(platformData: Record<string, any>) {
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

  return {
    total_posts: totalPosts,
    total_engagement: totalEngagement,
    total_reach: totalReach,
    total_impressions: totalImpressions,
    engagement_rate: parseFloat(engagementRate.toFixed(2)),
    platform_stats: platformStats
  };
}

// Process snapshots for a single user
async function processUserSnapshot(userId: string, supabase: any) {
  try {
    console.log(`Processing snapshot for user: ${userId}`);

    // Fetch analytics from all platforms
    const platforms = ['facebook', 'instagram', 'threads', 'bluesky', 'pinterest', 'tiktok'];
    const platformData: Record<string, any> = {};

    for (const platform of platforms) {
      platformData[platform] = await fetchPlatformAnalytics(userId, platform);
    }

    // Calculate aggregate metrics
    const metrics = calculateAggregateAnalytics(platformData);

    // Check if snapshot already exists for today
    const { data: existingSnapshot } = await supabase
      .from('analytics_snapshots')
      .select('id')
      .eq('user_id', userId)
      .eq('snapshot_date', new Date().toISOString().split('T')[0])
      .single();

    if (existingSnapshot) {
      // Update existing snapshot
      const { error } = await supabase
        .from('analytics_snapshots')
        .update({
          ...metrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSnapshot.id);

      if (error) {
        console.error(`Error updating snapshot for user ${userId}:`, error);
        return false;
      }

      console.log(`Updated snapshot for user ${userId}`);
    } else {
      // Create new snapshot
      const { error } = await supabase
        .from('analytics_snapshots')
        .insert({
          user_id: userId,
          snapshot_date: new Date().toISOString().split('T')[0],
          ...metrics
        });

      if (error) {
        console.error(`Error creating snapshot for user ${userId}:`, error);
        return false;
      }

      console.log(`Created snapshot for user ${userId}`);
    }

    return true;
  } catch (error) {
    console.error(`Error processing snapshot for user ${userId}:`, error);
    return false;
  }
}

// Shared processing logic for both GET and POST
async function processAnalyticsSnapshot(request: NextRequest) {
  try {
    // Verify authorization - accept both QStash signature and Bearer token
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    // Check for QStash signature
    const upstashSignature = request.headers.get('upstash-signature');
    let isQStashVerified = false;

    if (upstashSignature && process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
      try {
        // Verify QStash signature
        const receiver = new Receiver({
          currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
          nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
        });

        // Get request body as text (empty for GET requests)
        const body = await request.text();

        // Verify the signature
        await receiver.verify({
          signature: upstashSignature,
          body: body,
        });

        isQStashVerified = true;
        console.log('✅ QStash signature verified for analytics snapshot');
      } catch (error) {
        console.log('❌ QStash signature verification failed:', error);
        // Continue to check bearer token
      }
    }

    // Accept if either QStash signature is valid OR bearer token is correct
    const isBearerTokenValid = authHeader === expectedAuth;

    if (!isQStashVerified && !isBearerTokenValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Authorization method:', isQStashVerified ? 'QStash signature' : 'Bearer token');
    console.log('=== Processing Analytics Snapshots ===', new Date().toISOString());

    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json({ error: 'Missing Supabase URL' }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Missing Supabase service role key' }, { status: 500 });
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get all users with connected social accounts
    const { data: users, error: usersError } = await supabase
      .from('social_accounts')
      .select('user_id')
      .not('access_token', 'is', null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Get unique user IDs
    const userIdSet = new Set(users?.map(u => u.user_id) || []);
    const uniqueUserIds = Array.from(userIdSet);

    console.log(`Processing snapshots for ${uniqueUserIds.length} users...`);

    // Process snapshots for all users
    const results = await Promise.allSettled(
      uniqueUserIds.map(userId => processUserSnapshot(userId, supabase))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - successful;

    console.log(`Snapshot processing complete. Success: ${successful}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      processed: uniqueUserIds.length,
      successful,
      failed
    });

  } catch (error) {
    console.error('Error in snapshot cron job:', error);
    return NextResponse.json(
      { error: 'Failed to process snapshots' },
      { status: 500 }
    );
  }
}

// Export GET handler - called by manual triggers or testing
export async function GET(request: NextRequest) {
  return processAnalyticsSnapshot(request);
}

// Export POST handler - called by QStash
export async function POST(request: NextRequest) {
  return processAnalyticsSnapshot(request);
}

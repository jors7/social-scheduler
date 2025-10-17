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


// Process snapshots for all accounts of a single user
async function processUserSnapshot(userId: string, supabase: any) {
  try {
    console.log(`Processing snapshots for user: ${userId}`);

    // Get all active social accounts for this user
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (accountsError || !accounts || accounts.length === 0) {
      console.log(`No active accounts for user ${userId}`);
      return false;
    }

    const today = new Date().toISOString().split('T')[0];
    let successCount = 0;

    // Process each account separately
    for (const account of accounts) {
      try {
        let metrics: any = null;

        // Fetch current metrics based on platform
        switch (account.platform) {
          case 'facebook':
            metrics = await fetchFacebookMetrics(userId, account);
            break;
          case 'instagram':
            metrics = await fetchInstagramMetrics(userId, account);
            break;
          case 'threads':
            metrics = await fetchThreadsMetrics(userId, account);
            break;
          case 'tiktok':
            metrics = await fetchTikTokMetrics(userId, account);
            break;
          case 'pinterest':
            metrics = await fetchPinterestMetrics(userId, account);
            break;
          case 'bluesky':
            metrics = await fetchBlueskyMetrics(userId, account);
            break;
          default:
            console.log(`Unsupported platform: ${account.platform}`);
            continue;
        }

        if (!metrics) {
          console.log(`No metrics for ${account.platform} account ${account.id}`);
          continue;
        }

        // Create or update snapshot for this account
        const { error } = await supabase
          .from('analytics_snapshots')
          .upsert({
            user_id: userId,
            platform: account.platform,
            account_id: account.id,
            snapshot_date: today,
            metrics: metrics
          }, {
            onConflict: 'user_id,platform,account_id,snapshot_date'
          });

        if (error) {
          console.error(`Error saving snapshot for ${account.platform} account ${account.id}:`, error);
        } else {
          successCount++;
          console.log(`✓ Saved snapshot for ${account.platform} account ${account.username || account.id}`);
        }
      } catch (error) {
        console.error(`Error processing ${account.platform} account ${account.id}:`, error);
      }
    }

    console.log(`Processed ${successCount}/${accounts.length} accounts for user ${userId}`);
    return successCount > 0;
  } catch (error) {
    console.error(`Error processing snapshots for user ${userId}:`, error);
    return false;
  }
}

// Platform-specific metric fetchers
async function fetchFacebookMetrics(userId: string, account: any): Promise<any | null> {
  const data = await fetchPlatformAnalytics(userId, 'facebook');
  if (!data?.metrics) return null;

  return {
    impressions: data.metrics.totalImpressions || 0,
    engagement: data.metrics.totalEngagement || 0,
    reach: data.metrics.totalReach || 0,
    page_views: 0, // Not available in current API
    followers: 0 // Not available in current API
  };
}

async function fetchInstagramMetrics(userId: string, account: any): Promise<any | null> {
  const data = await fetchPlatformAnalytics(userId, 'instagram');
  if (!data?.metrics?.posts) return null;

  const posts = data.metrics.posts;
  return posts.reduce((acc: any, post: any) => ({
    reach: acc.reach + (post.metrics?.reach || 0),
    likes: acc.likes + (post.metrics?.likes || 0),
    comments: acc.comments + (post.metrics?.comments || 0),
    saves: acc.saves + (post.metrics?.saves || 0),
    shares: acc.shares + (post.metrics?.shares || 0)
  }), { reach: 0, likes: 0, comments: 0, saves: 0, shares: 0 });
}

async function fetchThreadsMetrics(userId: string, account: any): Promise<any | null> {
  const data = await fetchPlatformAnalytics(userId, 'threads');
  if (!data?.metrics?.posts) return null;

  const posts = data.metrics.posts;
  return posts.reduce((acc: any, post: any) => ({
    views: acc.views + (post.metrics?.views || 0),
    likes: acc.likes + (post.metrics?.likes || 0),
    replies: acc.replies + (post.metrics?.replies || 0),
    reposts: acc.reposts + (post.metrics?.reposts || 0),
    quotes: acc.quotes + (post.metrics?.quotes || 0)
  }), { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0 });
}

async function fetchTikTokMetrics(userId: string, account: any): Promise<any | null> {
  const data = await fetchPlatformAnalytics(userId, 'tiktok');
  if (!data?.metrics) return null;

  return {
    follower_count: data.metrics.follower_count || 0,
    following_count: data.metrics.following_count || 0,
    likes_count: data.metrics.likes_count || 0,
    video_count: data.metrics.video_count || 0
  };
}

async function fetchPinterestMetrics(userId: string, account: any): Promise<any | null> {
  const data = await fetchPlatformAnalytics(userId, 'pinterest');
  if (!data?.metrics?.posts) return null;

  const posts = data.metrics.posts;
  return posts.reduce((acc: any, pin: any) => ({
    saves: acc.saves + (pin.saves || 0),
    pin_clicks: acc.pin_clicks + (pin.pin_clicks || 0),
    impressions: acc.impressions + (pin.impressions || 0),
    outbound_clicks: acc.outbound_clicks + (pin.outbound_clicks || 0)
  }), { saves: 0, pin_clicks: 0, impressions: 0, outbound_clicks: 0 });
}

async function fetchBlueskyMetrics(userId: string, account: any): Promise<any | null> {
  const data = await fetchPlatformAnalytics(userId, 'bluesky');
  if (!data?.metrics?.posts) return null;

  const posts = data.metrics.posts;
  return posts.reduce((acc: any, post: any) => ({
    likes: acc.likes + (post.likes || 0),
    reposts: acc.reposts + (post.reposts || 0),
    replies: acc.replies + (post.replies || 0),
    quotes: acc.quotes + (post.quotes || 0)
  }), { likes: 0, reposts: 0, replies: 0, quotes: 0 });
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

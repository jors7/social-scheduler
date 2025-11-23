import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { FeatureCategory, FeatureStatus, FeatureRequestStats } from '@/lib/feature-requests/types';

// GET /api/admin/feature-requests
// Admin view with stats and filtering
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!subscription || !['admin', 'super_admin'].includes(subscription.role || '')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as FeatureCategory | 'all' | null;
    const status = searchParams.get('status') as FeatureStatus | 'all' | null;
    const priority = searchParams.get('priority');
    const sort = searchParams.get('sort') || 'votes';

    // Build query
    let query = supabase
      .from('feature_requests')
      .select('*');

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    // Apply sorting
    switch (sort) {
      case 'votes':
        query = query.order('vote_count', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'updated':
        query = query.order('updated_at', { ascending: false });
        break;
      case 'priority':
        query = query.order('priority', { ascending: false });
        break;
      default:
        query = query.order('vote_count', { ascending: false });
    }

    const { data: requests, error: requestsError } = await query;

    if (requestsError) {
      console.error('Error fetching feature requests:', requestsError);
      return NextResponse.json(
        { error: 'Failed to fetch feature requests' },
        { status: 500 }
      );
    }

    // Calculate stats
    const stats: FeatureRequestStats = {
      total: requests?.length || 0,
      byCategory: {
        analytics: 0,
        posting: 0,
        ui_ux: 0,
        integration: 0,
        automation: 0,
        collaboration: 0,
        ai_features: 0,
        mobile: 0,
        other: 0,
      },
      byStatus: {
        submitted: 0,
        under_review: 0,
        planned: 0,
        in_progress: 0,
        completed: 0,
        declined: 0,
      },
      totalVotes: 0,
      customRequests: 0,
      suggestedRequests: 0,
    };

    requests?.forEach(request => {
      stats.byCategory[request.category as FeatureCategory]++;
      stats.byStatus[request.status as FeatureStatus]++;
      stats.totalVotes += request.vote_count;
      if (request.is_custom) {
        stats.customRequests++;
      } else {
        stats.suggestedRequests++;
      }
    });

    return NextResponse.json({
      requests: requests || [],
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/feature-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

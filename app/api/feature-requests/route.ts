import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { FeatureCategory, GetFeatureRequestsResponse } from '@/lib/feature-requests/types';
import { FEATURE_CATEGORIES } from '@/lib/feature-requests/constants';

// GET /api/feature-requests
// Fetch all feature requests with optional filtering
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as FeatureCategory | 'all' | null;
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'votes'; // votes, newest, oldest, updated

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

    // Get user's voted features
    const { data: votedFeatures, error: votesError } = await supabase
      .from('feature_votes')
      .select('feature_request_id')
      .eq('user_id', user.id);

    if (votesError) {
      console.error('Error fetching user votes:', votesError);
    }

    const votedIds = votedFeatures?.map(v => v.feature_request_id) || [];

    // Return response
    const response: GetFeatureRequestsResponse = {
      requests: requests || [],
      votedFeatures: votedIds,
      categories: FEATURE_CATEGORIES.map(c => c.id),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/feature-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

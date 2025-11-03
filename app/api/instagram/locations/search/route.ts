import { NextRequest, NextResponse } from 'next/server';
import { searchFacebookPlaces } from '@/lib/instagram/location-search';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Instagram Location Search API
 *
 * Searches for Instagram-compatible locations using Facebook Pages Search API.
 * Returns locations (Facebook Pages) that have geographic coordinates and can
 * be used as location_id when creating Instagram posts.
 *
 * Endpoint: GET /api/instagram/locations/search?q={query}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Get current user
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Instagram account with access tokens (both Instagram and Facebook Page)
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('access_token, access_secret')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true)
      .single();

    if (error || !account) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please connect your Instagram account in Settings.' },
        { status: 400 }
      );
    }

    // Use Facebook Page token (access_secret) for Facebook Graph API calls
    // Fall back to Instagram token if Page token not available (for backwards compatibility)
    const facebookToken = account.access_secret || account.access_token;

    if (!facebookToken) {
      return NextResponse.json(
        { error: 'Invalid access token. Please reconnect your Instagram account in Settings.' },
        { status: 401 }
      );
    }

    // If using Instagram token (no Page token), provide helpful error
    if (!account.access_secret) {
      console.warn(`User ${user.id} attempting location search without Facebook Page token. Reconnection required.`);
      return NextResponse.json(
        { error: 'Location search requires reconnecting your Instagram account. Please disconnect and reconnect in Settings.' },
        { status: 401 }
      );
    }

    // Search for locations using Facebook Pages API with Facebook Page token
    console.log(`Location search request from user ${user.id}: "${query}"`);
    const locations = await searchFacebookPlaces(
      query,
      facebookToken,
      25 // limit
    );

    console.log(`Returning ${locations.length} locations for query "${query}"`);

    return NextResponse.json({
      success: true,
      query: query,
      count: locations.length,
      locations: locations
    });

  } catch (error: any) {
    console.error('Location search error:', error);

    // Check for authentication errors
    if (error?.message?.includes('authentication') || error?.message?.includes('token')) {
      return NextResponse.json(
        { error: 'Instagram authentication expired. Please reconnect your account in Settings.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search locations' },
      { status: 500 }
    );
  }
}

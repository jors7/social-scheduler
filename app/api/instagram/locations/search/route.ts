import { NextRequest, NextResponse } from 'next/server';
import { searchGooglePlaces } from '@/lib/google/places-service';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Instagram Location Search API
 *
 * Searches for Instagram-compatible locations using Google Places API.
 * Returns locations that can be used as location_id when creating Instagram posts.
 *
 * Note: Switched from Facebook Pages Search to Google Places API to avoid
 * Facebook OAuth token requirements. Google Place IDs work as Instagram location_id.
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

    // Check if Google Places API key is configured
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('[Location Search] GOOGLE_PLACES_API_KEY not configured');
      return NextResponse.json(
        { error: 'Location search is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Get current user (still require authentication for rate limiting and logging)
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

    // Search for locations using Google Places API
    console.log(`[Location Search] Request from user ${user.id}: "${query}"`);
    const locations = await searchGooglePlaces(
      query,
      apiKey,
      25 // limit
    );

    console.log(`[Location Search] Returning ${locations.length} locations for query "${query}"`);

    return NextResponse.json({
      success: true,
      query: query,
      count: locations.length,
      locations: locations,
      source: 'google_places' // Indicate data source
    });

  } catch (error: any) {
    console.error('[Location Search] Error:', error);

    // Check for Google API errors
    if (error?.message?.includes('API')) {
      return NextResponse.json(
        { error: 'Location search service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search locations' },
      { status: 500 }
    );
  }
}

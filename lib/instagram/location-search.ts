/**
 * Instagram Location Search Service
 *
 * Uses Facebook Pages Search API to find locations that can be used
 * for Instagram post tagging.
 *
 * How it works:
 * 1. Search Facebook Pages by query string
 * 2. Filter results to only Pages with location coordinates (lat/long)
 * 3. These Page IDs can be used as location_id when creating Instagram posts
 *
 * API Reference: https://developers.facebook.com/docs/pages/searching
 */

export interface InstagramLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

/**
 * Search for locations using Facebook Pages Search API
 *
 * @param query - Search query (e.g., "Starbucks New York")
 * @param accessToken - Facebook/Instagram access token
 * @param limit - Maximum number of results (default: 25)
 * @returns Array of locations with coordinates
 */
export async function searchFacebookPlaces(
  query: string,
  accessToken: string,
  limit: number = 25
): Promise<InstagramLocation[]> {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    console.log('Searching Facebook Pages for:', query);

    const response = await fetch(
      `https://graph.facebook.com/v20.0/pages/search?` +
      `q=${encodeURIComponent(query)}` +
      `&fields=id,name,location,link` +
      `&limit=${limit}` +
      `&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Facebook Pages Search failed:', error);
      throw new Error(error.error?.message || 'Location search failed');
    }

    const data = await response.json();
    console.log(`Found ${data.data?.length || 0} pages for query "${query}"`);

    // Filter to only pages with location coordinates
    const locations = data.data
      .filter((page: any) => {
        const hasLocation = page.location?.latitude && page.location?.longitude;
        if (!hasLocation) {
          console.log(`Skipping page "${page.name}" - no coordinates`);
        }
        return hasLocation;
      })
      .map((page: any) => ({
        id: page.id,
        name: page.name,
        address: page.location.street || '',
        city: page.location.city || '',
        state: page.location.state || '',
        country: page.location.country || '',
        latitude: page.location.latitude,
        longitude: page.location.longitude
      }));

    console.log(`Filtered to ${locations.length} locations with coordinates`);
    return locations;

  } catch (error: any) {
    console.error('Error searching Facebook places:', error);
    throw new Error(`Location search failed: ${error.message}`);
  }
}

/**
 * Validate that a location ID is valid for Instagram posting
 *
 * @param locationId - Facebook Page ID to validate
 * @param accessToken - Facebook/Instagram access token
 * @returns True if location is valid, false otherwise
 */
export async function validateLocationId(
  locationId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${locationId}?` +
      `fields=id,name,location` +
      `&access_token=${accessToken}`
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // Must have location with coordinates
    return !!(data.location?.latitude && data.location?.longitude);

  } catch (error) {
    console.error('Error validating location ID:', error);
    return false;
  }
}

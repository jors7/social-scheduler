/**
 * Google Places API Service
 *
 * Provides location search functionality using Google Places API.
 * Used for Instagram location tagging without requiring Facebook OAuth.
 *
 * API Documentation: https://developers.google.com/maps/documentation/places/web-service/autocomplete
 */

export interface GooglePlaceResult {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
}

/**
 * Search for locations using Google Places Autocomplete API
 *
 * @param query - Search query (e.g., "Starbucks New York")
 * @param apiKey - Google Places API key
 * @param limit - Maximum number of results (default: 25)
 * @returns Array of location results
 */
export async function searchGooglePlaces(
  query: string,
  apiKey: string,
  limit: number = 25
): Promise<GooglePlaceResult[]> {
  try {
    // Step 1: Get autocomplete predictions
    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    autocompleteUrl.searchParams.append('input', query)
    autocompleteUrl.searchParams.append('types', 'establishment') // Only businesses and places
    autocompleteUrl.searchParams.append('key', apiKey)

    console.log(`[Google Places] Searching for: "${query}"`)

    const autocompleteResponse = await fetch(autocompleteUrl.toString())

    if (!autocompleteResponse.ok) {
      const errorText = await autocompleteResponse.text()
      console.error('[Google Places] Autocomplete API error:', errorText)
      throw new Error(`Google Places API error: ${autocompleteResponse.status}`)
    }

    const autocompleteData = await autocompleteResponse.json()

    if (autocompleteData.status !== 'OK' && autocompleteData.status !== 'ZERO_RESULTS') {
      console.error('[Google Places] API returned error status:', autocompleteData.status)
      throw new Error(`Google Places API error: ${autocompleteData.status}`)
    }

    if (!autocompleteData.predictions || autocompleteData.predictions.length === 0) {
      console.log('[Google Places] No results found')
      return []
    }

    // Limit results
    const predictions = autocompleteData.predictions.slice(0, limit)
    console.log(`[Google Places] Found ${predictions.length} predictions`)

    // Step 2: Get detailed information for each place
    const places: GooglePlaceResult[] = []

    for (const prediction of predictions) {
      try {
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
        detailsUrl.searchParams.append('place_id', prediction.place_id)
        detailsUrl.searchParams.append('fields', 'place_id,name,formatted_address,address_components')
        detailsUrl.searchParams.append('key', apiKey)

        const detailsResponse = await fetch(detailsUrl.toString())

        if (!detailsResponse.ok) {
          console.warn(`[Google Places] Failed to get details for ${prediction.place_id}`)
          continue
        }

        const detailsData = await detailsResponse.json()

        if (detailsData.status !== 'OK' || !detailsData.result) {
          console.warn(`[Google Places] Invalid details response for ${prediction.place_id}`)
          continue
        }

        const place = detailsData.result

        // Parse address components
        let city = ''
        let state = ''
        let country = ''

        if (place.address_components) {
          for (const component of place.address_components) {
            if (component.types.includes('locality')) {
              city = component.long_name
            } else if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name
            } else if (component.types.includes('country')) {
              country = component.long_name
            }
          }
        }

        places.push({
          id: place.place_id,
          name: place.name || prediction.description,
          address: place.formatted_address || '',
          city: city,
          state: state,
          country: country
        })
      } catch (error) {
        console.error(`[Google Places] Error fetching details for ${prediction.place_id}:`, error)
        // Continue with next place
      }
    }

    console.log(`[Google Places] Returning ${places.length} complete results`)
    return places

  } catch (error) {
    console.error('[Google Places] Search error:', error)
    throw error
  }
}

/**
 * Check if Google Places API key is configured
 */
export function isGooglePlacesConfigured(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY
}

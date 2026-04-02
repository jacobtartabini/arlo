import { invokeEdgeFunction } from '@/lib/edge-functions';
import type { LatLng, Place } from '@/types/maps';

export interface PlaceSearchResult extends Place {
  distanceMeters?: number;
}

interface PlacesSearchResponse {
  places: PlaceSearchResult[];
}

interface PlaceDetailsResponse {
  place: Place | null;
}

interface ReverseGeocodeResponse {
  address: string | null;
}

export async function searchPlaces(query: string, center?: LatLng, radiusMeters = 24000) {
  if (!query.trim()) return [] as PlaceSearchResult[];

  const body: Record<string, unknown> = { query: query.trim() };
  if (center) {
    body.location = `${center.lat},${center.lng}`;
    body.radius = radiusMeters;
  }

  const result = await invokeEdgeFunction<PlacesSearchResponse>('maps-api/text-search', body, { requireAuth: true });
  if (!result.ok) {
    throw new Error(result.message || 'Search failed');
  }
  return result.data?.places ?? [];
}

export async function getPlaceDetails(placeId: string) {
  if (!placeId) return null;

  const result = await invokeEdgeFunction<PlaceDetailsResponse>(
    'maps-api/place-details',
    { placeId },
    { requireAuth: true }
  );
  if (!result.ok) {
    throw new Error(result.message || 'Place lookup failed');
  }
  return result.data?.place ?? null;
}

export async function reverseGeocode(location: LatLng) {
  const result = await invokeEdgeFunction<ReverseGeocodeResponse>(
    'maps-api/reverse-geocode',
    { location: `${location.lat},${location.lng}` },
    { requireAuth: true }
  );
  if (!result.ok) {
    throw new Error(result.message || 'Reverse geocode failed');
  }
  return result.data?.address ?? null;
}

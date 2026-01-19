import { supabase } from '@/integrations/supabase/client';
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

  const { data, error } = await supabase.functions.invoke<PlacesSearchResponse>('maps-api/text-search', {
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.places ?? [];
}

export async function getPlaceDetails(placeId: string) {
  if (!placeId) return null;

  const { data, error } = await supabase.functions.invoke<PlaceDetailsResponse>('maps-api/place-details', {
    body: { placeId },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.place ?? null;
}

export async function reverseGeocode(location: LatLng) {
  const { data, error } = await supabase.functions.invoke<ReverseGeocodeResponse>('maps-api/reverse-geocode', {
    body: { location: `${location.lat},${location.lng}` },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.address ?? null;
}

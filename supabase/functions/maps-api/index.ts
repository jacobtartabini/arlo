import { verifyArloJWT, handleCorsOptions, jsonResponse, unauthorizedResponse, errorResponse } from '../_shared/arloAuth.ts';

// Prefer server-side key without referrer restrictions, fallback to frontend key
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('VITE_GOOGLE_MAPS_API_KEY');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  // Verify authentication
  const authResult = await verifyArloJWT(req);
  if (!authResult.authenticated) {
    const errorMessage = authResult.error || 'Authentication required';
    console.error(`[maps-api] Auth failed: ${errorMessage}`);
    return unauthorizedResponse(req, errorMessage);
  }

  if (!authResult.userId) {
    console.error('[maps-api] Auth succeeded but no userId in JWT sub claim');
    return unauthorizedResponse(req, 'Invalid token: missing user identity');
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('[maps-api] VITE_GOOGLE_MAPS_API_KEY not configured');
    return errorResponse(req, 'Maps API not configured', 500);
  }

  const url = new URL(req.url);
  const action = url.pathname.split('/').pop();

  try {
    const body = req.method === 'POST' ? await req.json() : null;

    switch (action) {
      case 'geocode': {
        const address = url.searchParams.get('address') || body?.address;
        if (!address) {
          return errorResponse(req, 'Address is required', 400);
        }

        const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
        geocodeUrl.searchParams.set('address', address);
        geocodeUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

        const response = await fetch(geocodeUrl.toString());
        const data = await response.json();

        if (data.status !== 'OK') {
          return jsonResponse(req, { error: data.status, results: [] });
        }

        return jsonResponse(req, {
          results: data.results.map((r: any) => ({
            placeId: r.place_id,
            address: r.formatted_address,
            location: {
              lat: r.geometry.location.lat,
              lng: r.geometry.location.lng,
            },
            types: r.types,
          })),
        });
      }

      case 'place-details': {
        const placeId = url.searchParams.get('placeId') || body?.placeId;
        if (!placeId) {
          return errorResponse(req, 'Place ID is required', 400);
        }

        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        detailsUrl.searchParams.set('place_id', placeId);
        detailsUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
        detailsUrl.searchParams.set('fields', 'name,formatted_address,geometry,opening_hours,formatted_phone_number,website,rating,photos,types');

        const response = await fetch(detailsUrl.toString());
        const data = await response.json();

        if (data.status !== 'OK') {
          return jsonResponse(req, { error: data.status, place: null });
        }

        const place = data.result;
        return jsonResponse(req, {
          place: {
            placeId,
            name: place.name,
            address: place.formatted_address,
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            },
            types: place.types,
            openNow: place.opening_hours?.open_now,
            rating: place.rating,
            phoneNumber: place.formatted_phone_number,
            website: place.website,
            photos: place.photos?.slice(0, 5).map((p: any) => 
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
            ),
          },
        });
      }

      case 'directions': {
        if (req.method !== 'POST') {
          return errorResponse(req, 'POST required', 405);
        }

        const { origin, destination, waypoints, optimizeWaypoints, travelMode, departureTime, avoidHighways, avoidTolls, alternatives } = body;

        if (!origin || !destination) {
          return errorResponse(req, 'Origin and destination are required', 400);
        }

        const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
        
        // Handle origin/destination as either string or LatLng
        const formatLocation = (loc: string | { lat: number; lng: number }) => 
          typeof loc === 'string' ? loc : `${loc.lat},${loc.lng}`;

        directionsUrl.searchParams.set('origin', formatLocation(origin));
        directionsUrl.searchParams.set('destination', formatLocation(destination));
        directionsUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

        if (waypoints && waypoints.length > 0) {
          const waypointStr = (optimizeWaypoints ? 'optimize:true|' : '') + 
            waypoints.map(formatLocation).join('|');
          directionsUrl.searchParams.set('waypoints', waypointStr);
        }

        directionsUrl.searchParams.set('mode', (travelMode || 'DRIVING').toLowerCase());
        directionsUrl.searchParams.set('departure_time', departureTime === 'now' || !departureTime ? 'now' : String(Math.floor(new Date(departureTime).getTime() / 1000)));
        directionsUrl.searchParams.set('traffic_model', 'best_guess');
        
        if (alternatives !== false) {
          directionsUrl.searchParams.set('alternatives', 'true');
        }

        const avoid: string[] = [];
        if (avoidHighways) avoid.push('highways');
        if (avoidTolls) avoid.push('tolls');
        if (avoid.length > 0) {
          directionsUrl.searchParams.set('avoid', avoid.join('|'));
        }

        const response = await fetch(directionsUrl.toString());
        const data = await response.json();

        if (data.status !== 'OK') {
          return jsonResponse(req, { error: data.status, routes: [] });
        }

        const routes = data.routes.map((route: any, index: number) => ({
          id: `route-${index}`,
          summary: route.summary,
          distance: route.legs.reduce((acc: number, leg: any) => acc + leg.distance.value, 0),
          distanceText: route.legs.map((leg: any) => leg.distance.text).join(', '),
          duration: route.legs.reduce((acc: number, leg: any) => acc + leg.duration.value, 0),
          durationText: route.legs.map((leg: any) => leg.duration.text).join(', '),
          durationInTraffic: route.legs.reduce((acc: number, leg: any) => acc + (leg.duration_in_traffic?.value || leg.duration.value), 0),
          durationInTrafficText: route.legs.map((leg: any) => leg.duration_in_traffic?.text || leg.duration.text).join(', '),
          polyline: route.overview_polyline.points,
          warnings: route.warnings,
          waypointOrder: route.waypoint_order,
          steps: route.legs.flatMap((leg: any) => leg.steps.map((step: any) => ({
            instruction: step.html_instructions?.replace(/<[^>]*>/g, '') || '',
            distance: step.distance.text,
            duration: step.duration.text,
            maneuver: step.maneuver,
            startLocation: { lat: step.start_location.lat, lng: step.start_location.lng },
            endLocation: { lat: step.end_location.lat, lng: step.end_location.lng },
          }))),
        }));

        return jsonResponse(req, { routes });
      }

      case 'distance-matrix': {
        if (req.method !== 'POST') {
          return errorResponse(req, 'POST required', 405);
        }

        const { origins, destinations, travelMode } = body;

        if (!origins?.length || !destinations?.length) {
          return errorResponse(req, 'Origins and destinations are required', 400);
        }

        const formatLocation = (loc: string | { lat: number; lng: number }) => 
          typeof loc === 'string' ? loc : `${loc.lat},${loc.lng}`;

        const matrixUrl = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
        matrixUrl.searchParams.set('origins', origins.map(formatLocation).join('|'));
        matrixUrl.searchParams.set('destinations', destinations.map(formatLocation).join('|'));
        matrixUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
        matrixUrl.searchParams.set('mode', (travelMode || 'DRIVING').toLowerCase());
        matrixUrl.searchParams.set('departure_time', 'now');

        const response = await fetch(matrixUrl.toString());
        const data = await response.json();

        if (data.status !== 'OK') {
          return jsonResponse(req, { error: data.status, rows: [] });
        }

        return jsonResponse(req, {
          originAddresses: data.origin_addresses,
          destinationAddresses: data.destination_addresses,
          rows: data.rows.map((row: any) => ({
            elements: row.elements.map((el: any) => ({
              status: el.status,
              distance: el.distance?.text,
              distanceValue: el.distance?.value,
              duration: el.duration?.text,
              durationValue: el.duration?.value,
              durationInTraffic: el.duration_in_traffic?.text,
              durationInTrafficValue: el.duration_in_traffic?.value,
            })),
          })),
        });
      }

      default:
        return errorResponse(req, `Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error('[maps-api] Error:', error);
    return errorResponse(req, error instanceof Error ? error.message : 'Internal server error', 500);
  }
});

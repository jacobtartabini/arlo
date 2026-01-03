import { 
  handleCorsOptions,
  validateOrigin,
  jsonResponse, 
  errorResponse 
} from '../_shared/arloAuth.ts'

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const originError = validateOrigin(req);
  if (originError) return originError;

  try {
    if (!GOOGLE_PLACES_API_KEY) {
      console.error("[places-autocomplete] GOOGLE_PLACES_API_KEY not configured");
      return errorResponse(req, "Places API not configured", 500);
    }

    const { query, sessionToken } = await req.json();
    
    if (!query || typeof query !== "string" || query.length < 2) {
      return jsonResponse(req, { predictions: [] });
    }

    console.log("[places-autocomplete] Searching for:", query);

    // Use Google Places Autocomplete API
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", query);
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
    url.searchParams.set("types", "geocode|establishment");
    
    if (sessionToken) {
      url.searchParams.set("sessiontoken", sessionToken);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[places-autocomplete] Google API error:", errorText);
      return errorResponse(req, "Failed to fetch places", response.status);
    }

    const data = await response.json();
    
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("[places-autocomplete] API status:", data.status, data.error_message);
      return errorResponse(req, data.error_message || "Places API error", 400);
    }

    const predictions = (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || "",
    }));

    console.log("[places-autocomplete] Found", predictions.length, "results");
    return jsonResponse(req, { predictions });
  } catch (error) {
    console.error("[places-autocomplete] Error:", error);
    return errorResponse(req, error instanceof Error ? error.message : "Unknown error", 500);
  }
});

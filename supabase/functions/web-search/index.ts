import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  unauthorizedResponse,
  jsonResponse,
  errorResponse,
} from "../_shared/arloAuth.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  // Validate origin for non-OPTIONS requests
  const originError = validateOrigin(req);
  if (originError) return originError;

  // Verify authentication
  const authResult = await verifyArloJWT(req);
  if (!authResult.authenticated) {
    console.log("[web-search] Auth failed:", authResult.error);
    return unauthorizedResponse(req, authResult.error || "Authentication required");
  }

  console.log("[web-search] Authenticated user:", authResult.userId);

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q");
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    if (!query) {
      return errorResponse(req, "Query parameter 'q' is required", 400);
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("[web-search] FIRECRAWL_API_KEY not configured");
      return jsonResponse(req, {
        success: false,
        configured: false,
        error: "Search provider not configured. Connect Firecrawl in Settings → Connectors.",
        results: [],
      });
    }

    console.log("[web-search] Searching for:", query);

    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: Math.min(limit, 20), // Cap at 20 results
        lang: "en",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[web-search] Firecrawl API error:", data);
      return errorResponse(
        req,
        data.error || `Search failed with status ${response.status}`,
        response.status
      );
    }

    // Transform results to clean format
    const results = (data.data || []).map((item: {
      url?: string;
      title?: string;
      description?: string;
    }) => ({
      url: item.url || "",
      title: item.title || "Untitled",
      snippet: item.description || "",
      favicon: item.url ? `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32` : null,
    }));

    console.log("[web-search] Found", results.length, "results");

    return jsonResponse(req, {
      success: true,
      configured: true,
      query,
      results,
    });
  } catch (error) {
    console.error("[web-search] Error:", error);
    return errorResponse(
      req,
      error instanceof Error ? error.message : "Search failed",
      500
    );
  }
});

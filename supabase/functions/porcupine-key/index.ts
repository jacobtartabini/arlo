import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  getCorsHeaders,
  unauthorizedResponse,
  errorResponse,
  jsonResponse 
} from "../_shared/arloAuth.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Verify authentication
    const authResult = await verifyArloJWT(req);
    if (!authResult.authenticated) {
      return unauthorizedResponse(req, authResult.error || "Unauthorized");
    }

    const accessKey = Deno.env.get("PICOVOICE_ACCESS_KEY");
    
    if (!accessKey) {
      console.error("[porcupine-key] PICOVOICE_ACCESS_KEY not found in environment");
      return errorResponse(req, "Picovoice access key not configured", 500);
    }

    console.log("[porcupine-key] Returning access key for user:", authResult.userId);
    return jsonResponse(req, { accessKey });
    
  } catch (error: unknown) {
    console.error("[porcupine-key] Error:", error);
    return errorResponse(req, error instanceof Error ? error.message : String(error), 500);
  }
});

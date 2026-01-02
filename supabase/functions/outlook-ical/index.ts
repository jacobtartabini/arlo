import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse,
  validateOrigin
} from '../_shared/arloAuth.ts'
import { encrypt } from '../_shared/encryption.ts'
import { checkAuthRateLimit, AUTH_RATE_LIMITS, logAuthFailure } from '../_shared/authRateLimit.ts'

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  // Validate origin for non-OPTIONS requests
  const originError = validateOrigin(req);
  if (originError) {
    console.log('[outlook-ical] Origin validation failed');
    return originError;
  }

  // Apply rate limiting
  const rateLimitResponse = checkAuthRateLimit(req, AUTH_RATE_LIMITS.calendarSync);
  if (rateLimitResponse) {
    console.log('[outlook-ical] Rate limited');
    return rateLimitResponse;
  }

  try {
    // Verify JWT authentication
    const authResult = await verifyArloJWT(req);
    
    if (!authResult.authenticated) {
      console.log('[outlook-ical] Authentication failed:', authResult.error);
      logAuthFailure(req, authResult.error || 'JWT verification failed');
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    // userKey is derived from JWT.sub - TEXT identifier (email/tailnet)
    const userKey = authResult.userId;
    console.log('[outlook-ical] Authenticated user_key (from JWT.sub):', userKey);

    const { action, icalUrl } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Add or update iCal URL
    if (action === "connect") {
      if (!icalUrl) {
        return errorResponse(req, "iCal URL is required", 400);
      }

      // Validate the URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(icalUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return errorResponse(req, "Invalid iCal URL protocol", 400);
        }
      } catch {
        return errorResponse(req, "Invalid iCal URL format", 400);
      }

      // Validate the URL is accessible
      try {
        const testResponse = await fetch(icalUrl, { method: "HEAD" });
        if (!testResponse.ok) {
          return errorResponse(req, "Unable to access iCal URL. Please check the URL is correct.", 400);
        }
      } catch (fetchError) {
        return errorResponse(req, "Unable to access iCal URL. Please check the URL is correct.", 400);
      }

      // Encrypt the iCal URL before storing
      const encryptedIcalUrl = await encrypt(icalUrl);

      // Store the encrypted iCal URL using user_key (TEXT column)
      const { error: upsertError } = await supabase
        .from("calendar_integrations")
        .upsert({
          user_key: userKey, // TEXT identifier from JWT.sub
          provider: "outlook_ics",
          enabled: true,
          ical_url: encryptedIcalUrl,
          last_sync_status: "pending",
        }, {
          onConflict: "user_key,provider",
        });

      if (upsertError) {
        console.error("[outlook-ical] Database error:", upsertError);
        return errorResponse(req, "Failed to save configuration", 500);
      }

      console.log("[outlook-ical] iCal URL configured for user_key:", userKey);
      return jsonResponse(req, { success: true });
    }

    // Disconnect Outlook iCal using user_key
    if (action === "disconnect") {
      // Delete integration record using user_key
      await supabase
        .from("calendar_integrations")
        .delete()
        .eq("user_key", userKey)
        .eq("provider", "outlook_ics");

      // Delete synced Outlook events using user_key
      await supabase
        .from("calendar_events")
        .delete()
        .eq("user_key", userKey)
        .eq("source", "outlook_ics");

      console.log("[outlook-ical] Disconnected Outlook iCal for user_key:", userKey);
      return jsonResponse(req, { success: true });
    }

    return errorResponse(req, "Invalid action", 400);
  } catch (error) {
    console.error("[outlook-ical] Error:", error);
    return errorResponse(req, error instanceof Error ? error.message : "Unknown error", 500);
  }
});

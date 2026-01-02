import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse 
} from '../_shared/arloAuth.ts'

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Verify JWT authentication
    const authResult = await verifyArloJWT(req);
    
    if (!authResult.authenticated) {
      console.log('[outlook-ical] Authentication failed:', authResult.error);
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    // userId is derived from JWT.sub - no ARLO_USER_ID used
    const userId = authResult.userId;
    console.log('[outlook-ical] Authenticated user (from JWT.sub):', userId);

    const { action, icalUrl } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Add or update iCal URL
    if (action === "connect") {
      if (!icalUrl) {
        return errorResponse(req, "iCal URL is required", 400);
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

      // Store the iCal URL
      const { error: upsertError } = await supabase
        .from("calendar_integrations")
        .upsert({
          user_id: userId,
          provider: "outlook_ics",
          enabled: true,
          ical_url: icalUrl,
          last_sync_status: "pending",
        }, {
          onConflict: "user_id,provider",
        });

      if (upsertError) {
        console.error("[outlook-ical] Database error:", upsertError);
        return errorResponse(req, "Failed to save configuration", 500);
      }

      console.log("[outlook-ical] iCal URL configured for user:", userId);
      return jsonResponse(req, { success: true });
    }

    // Disconnect Outlook iCal
    if (action === "disconnect") {
      // Delete integration record
      await supabase
        .from("calendar_integrations")
        .delete()
        .eq("user_id", userId)
        .eq("provider", "outlook_ics");

      // Delete synced Outlook events
      await supabase
        .from("calendar_events")
        .delete()
        .eq("user_id", userId)
        .eq("source", "outlook_ics");

      console.log("[outlook-ical] Disconnected Outlook iCal for user:", userId);
      return jsonResponse(req, { success: true });
    }

    return errorResponse(req, "Invalid action", 400);
  } catch (error) {
    console.error("[outlook-ical] Error:", error);
    return errorResponse(req, error instanceof Error ? error.message : "Unknown error", 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  getCorsHeaders,
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse 
} from '../_shared/arloAuth.ts'

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Determine the redirect URI based on environment
function getRedirectUri(): string {
  return "https://arlo.jacobtartabini.com/login";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const body = await req.json();
    const { action, code, state, calendars, integrationId } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 2: Exchange code for tokens - This is called from the OAuth callback
    // It needs special handling because the user might not have a JWT yet
    if (action === "exchange_code") {
      if (!code || !state) {
        return errorResponse(req, "Missing code or state", 400);
      }

      let decodedUserId: string;
      try {
        const decoded = JSON.parse(atob(state));
        decodedUserId = decoded.userId;
      } catch {
        return errorResponse(req, "Invalid state", 400);
      }

      const redirectUri = getRedirectUri();

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("[google-calendar-auth] Token exchange error:", tokenData);
        return errorResponse(req, tokenData.error_description || tokenData.error, 400);
      }

      const { access_token, refresh_token, expires_in } = tokenData;
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      // Store tokens in database
      const { error: upsertError } = await supabase
        .from("calendar_integrations")
        .upsert({
          user_id: decodedUserId,
          provider: "google",
          enabled: true,
          access_token,
          refresh_token,
          token_expires_at: expiresAt,
          last_sync_status: "pending",
        }, {
          onConflict: "user_id,provider",
        });

      if (upsertError) {
        console.error("[google-calendar-auth] Database error:", upsertError);
        return errorResponse(req, "Failed to save tokens", 500);
      }

      console.log("[google-calendar-auth] Successfully connected Google Calendar for user:", decodedUserId);
      return jsonResponse(req, { success: true });
    }

    // All other actions require JWT authentication
    const authResult = await verifyArloJWT(req);
    
    if (!authResult.authenticated) {
      console.log('[google-calendar-auth] Authentication failed:', authResult.error);
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    const userId = authResult.userId;
    console.log('[google-calendar-auth] Authenticated user:', authResult.claims?.sub, 'userId:', userId);

    // Step 1: Generate OAuth URL
    if (action === "get_auth_url") {
      const redirectUri = getRedirectUri();
      const scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
      ].join(" ");

      const encodedState = btoa(JSON.stringify({ userId }));

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", encodedState);

      console.log("[google-calendar-auth] Generated auth URL for user:", userId);
      return jsonResponse(req, { url: authUrl.toString() });
    }

    // Step 3: Fetch calendar list
    if (action === "list_calendars") {
      // Get integration to access token
      const { data: integration, error: fetchError } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "google")
        .single();

      if (fetchError || !integration) {
        return errorResponse(req, "Google Calendar not connected", 400);
      }

      // Refresh token if needed
      let accessToken = integration.access_token;
      const expiresAt = new Date(integration.token_expires_at);
      if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: integration.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          await supabase
            .from("calendar_integrations")
            .update({
              access_token: accessToken,
              token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            })
            .eq("id", integration.id);
        }
      }

      // Fetch calendar list from Google
      const calendarListResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!calendarListResponse.ok) {
        const errorText = await calendarListResponse.text();
        console.error("[google-calendar-auth] Failed to fetch calendars:", errorText);
        return errorResponse(req, "Failed to fetch calendars", 500);
      }

      const calendarListData = await calendarListResponse.json();
      const calendarsList = (calendarListData.items || []).map((cal: any) => ({
        id: cal.id,
        name: cal.summary || cal.id,
        color: cal.backgroundColor || "#4285f4",
        primary: cal.primary || false,
        accessRole: cal.accessRole,
      }));

      console.log("[google-calendar-auth] Fetched", calendarsList.length, "calendars for user:", userId);
      return jsonResponse(req, { calendars: calendarsList });
    }

    // Step 4: Save selected calendars
    if (action === "save_calendars") {
      if (!integrationId || !calendars) {
        return errorResponse(req, "Missing required fields", 400);
      }

      // Delete existing selections for this integration
      await supabase
        .from("google_calendar_selections")
        .delete()
        .eq("integration_id", integrationId);

      // Insert new selections
      const selections = calendars.map((cal: any) => ({
        integration_id: integrationId,
        calendar_id: cal.id,
        calendar_name: cal.name,
        calendar_color: cal.color,
        enabled: cal.enabled,
      }));

      if (selections.length > 0) {
        const { error: insertError } = await supabase
          .from("google_calendar_selections")
          .insert(selections);

        if (insertError) {
          console.error("[google-calendar-auth] Failed to save calendars:", insertError);
          return errorResponse(req, "Failed to save calendars", 500);
        }
      }

      // Clear sync cursors to force fresh sync
      await supabase
        .from("calendar_integrations")
        .update({ sync_cursor: null })
        .eq("id", integrationId);

      console.log("[google-calendar-auth] Saved", selections.length, "calendar selections");
      return jsonResponse(req, { success: true });
    }

    // Step 5: Disconnect Google Calendar
    if (action === "disconnect") {
      // Delete integration record (cascade will delete calendar selections)
      await supabase
        .from("calendar_integrations")
        .delete()
        .eq("user_id", userId)
        .eq("provider", "google");

      // Delete synced Google events
      await supabase
        .from("calendar_events")
        .delete()
        .eq("user_id", userId)
        .eq("source", "google");

      console.log("[google-calendar-auth] Disconnected Google Calendar for user:", userId);
      return jsonResponse(req, { success: true });
    }

    return errorResponse(req, "Invalid action", 400);
  } catch (error) {
    console.error("[google-calendar-auth] Error:", error);
    return errorResponse(req, error instanceof Error ? error.message : "Unknown error", 500);
  }
});

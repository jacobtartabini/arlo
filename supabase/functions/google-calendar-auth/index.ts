import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Fixed UUID for Tailscale auth (must match frontend)
const TAILSCALE_USER_UUID = '00000000-0000-0000-0000-000000000001';

// Determine the redirect URI based on environment
function getRedirectUri(): string {
  return "https://arlo.jacobtartabini.com/login";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, userId, code, state } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Generate OAuth URL
    if (action === "get_auth_url") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "User ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Exchange code for tokens
    if (action === "exchange_code") {
      if (!code || !state) {
        return new Response(JSON.stringify({ error: "Missing code or state" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let decodedUserId: string;
      try {
        const decoded = JSON.parse(atob(state));
        decodedUserId = decoded.userId;
      } catch {
        return new Response(JSON.stringify({ error: "Invalid state" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify({ error: "Failed to save tokens" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[google-calendar-auth] Successfully connected Google Calendar for user:", decodedUserId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Fetch calendar list
    if (action === "list_calendars") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "User ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get integration to access token
      const { data: integration, error: fetchError } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "google")
        .single();

      if (fetchError || !integration) {
        return new Response(JSON.stringify({ error: "Google Calendar not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify({ error: "Failed to fetch calendars" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const calendarListData = await calendarListResponse.json();
      const calendars = (calendarListData.items || []).map((cal: any) => ({
        id: cal.id,
        name: cal.summary || cal.id,
        color: cal.backgroundColor || "#4285f4",
        primary: cal.primary || false,
        accessRole: cal.accessRole,
      }));

      console.log("[google-calendar-auth] Fetched", calendars.length, "calendars for user:", userId);

      return new Response(JSON.stringify({ calendars }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 4: Save selected calendars
    if (action === "save_calendars") {
      const { calendars: selectedCalendars, integrationId } = body;
      
      if (!integrationId || !selectedCalendars) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete existing selections for this integration
      await supabase
        .from("google_calendar_selections")
        .delete()
        .eq("integration_id", integrationId);

      // Insert new selections
      const selections = selectedCalendars.map((cal: any) => ({
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
          return new Response(JSON.stringify({ error: "Failed to save calendars" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Clear sync cursors to force fresh sync
      await supabase
        .from("calendar_integrations")
        .update({ sync_cursor: null })
        .eq("id", integrationId);

      console.log("[google-calendar-auth] Saved", selections.length, "calendar selections");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 5: Disconnect Google Calendar
    if (action === "disconnect") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "User ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[google-calendar-auth] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, icalUrl } = await req.json();

    // Add or update iCal URL
    if (action === "connect") {
      if (!icalUrl) {
        return new Response(JSON.stringify({ error: "iCal URL is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate the URL is accessible
      try {
        const testResponse = await fetch(icalUrl, { method: "HEAD" });
        if (!testResponse.ok) {
          return new Response(JSON.stringify({ error: "Unable to access iCal URL. Please check the URL is correct." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (fetchError) {
        return new Response(JSON.stringify({ error: "Unable to access iCal URL. Please check the URL is correct." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Store the iCal URL
      const { error: upsertError } = await supabase
        .from("calendar_integrations")
        .upsert({
          user_id: user.id,
          provider: "outlook_ics",
          enabled: true,
          ical_url: icalUrl,
          last_sync_status: "pending",
        }, {
          onConflict: "user_id,provider",
        });

      if (upsertError) {
        console.error("[outlook-ical] Database error:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save configuration" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[outlook-ical] iCal URL configured for user:", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Disconnect Outlook iCal
    if (action === "disconnect") {
      // Delete integration record
      await supabase
        .from("calendar_integrations")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", "outlook_ics");

      // Delete synced Outlook events
      await supabase
        .from("calendar_events")
        .delete()
        .eq("user_id", user.id)
        .eq("source", "outlook_ics");

      console.log("[outlook-ical] Disconnected Outlook iCal for user:", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[outlook-ical] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

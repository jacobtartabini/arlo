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

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
  recurrence?: string[];
}

interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  sync_cursor?: string;
  ical_url?: string;
}

async function refreshGoogleToken(integration: CalendarIntegration): Promise<string | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("[calendar-sync] Token refresh error:", data);
      return null;
    }

    // Update token in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await supabase
      .from("calendar_integrations")
      .update({
        access_token: data.access_token,
        token_expires_at: expiresAt,
      })
      .eq("id", integration.id);

    return data.access_token;
  } catch (error) {
    console.error("[calendar-sync] Token refresh failed:", error);
    return null;
  }
}

async function getValidAccessToken(integration: CalendarIntegration): Promise<string | null> {
  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();

  // Refresh if expired or expiring within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshGoogleToken(integration);
  }

  return integration.access_token;
}

async function syncGoogleCalendar(integration: CalendarIntegration, supabase: any): Promise<{ success: boolean; error?: string; synced?: number }> {
  const accessToken = await getValidAccessToken(integration);
  if (!accessToken) {
    return { success: false, error: "Failed to get valid access token" };
  }

  try {
    // Fetch events from the last 30 days to next 90 days
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    calendarUrl.searchParams.set("timeMin", timeMin);
    calendarUrl.searchParams.set("timeMax", timeMax);
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("maxResults", "500");
    if (integration.sync_cursor) {
      calendarUrl.searchParams.set("syncToken", integration.sync_cursor);
    }

    const response = await fetch(calendarUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      // If sync token is invalid, do a full sync
      if (response.status === 410 && integration.sync_cursor) {
        console.log("[calendar-sync] Sync token expired, doing full sync");
        await supabase
          .from("calendar_integrations")
          .update({ sync_cursor: null })
          .eq("id", integration.id);
        return syncGoogleCalendar({ ...integration, sync_cursor: undefined }, supabase);
      }
      const errorText = await response.text();
      console.error("[calendar-sync] Google API error:", errorText);
      return { success: false, error: `Google API error: ${response.status}` };
    }

    const data = await response.json();
    const events: GoogleEvent[] = data.items || [];

    let syncedCount = 0;

    for (const event of events) {
      if (event.status === "cancelled") {
        // Delete cancelled events
        await supabase
          .from("calendar_events")
          .delete()
          .eq("user_id", integration.user_id)
          .eq("source", "google")
          .eq("external_id", event.id);
        continue;
      }

      const isAllDay = !event.start.dateTime;
      const startTime = event.start.dateTime || `${event.start.date}T00:00:00`;
      const endTime = event.end.dateTime || `${event.end.date}T23:59:59`;

      const eventData = {
        user_id: integration.user_id,
        title: event.summary || "Untitled Event",
        description: event.description || null,
        location: event.location || null,
        start_time: startTime,
        end_time: endTime,
        is_all_day: isAllDay,
        category: "meeting",
        color: "#4285f4", // Google blue
        source: "google",
        external_id: event.id,
        read_only: false,
        last_synced_at: new Date().toISOString(),
      };

      // Upsert event
      const { error } = await supabase
        .from("calendar_events")
        .upsert(eventData, {
          onConflict: "user_id,source,external_id",
        });

      if (error) {
        console.error("[calendar-sync] Error upserting event:", error);
      } else {
        syncedCount++;
      }
    }

    // Save sync token for incremental sync
    if (data.nextSyncToken) {
      await supabase
        .from("calendar_integrations")
        .update({
          sync_cursor: data.nextSyncToken,
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          last_sync_error: null,
        })
        .eq("id", integration.id);
    }

    console.log(`[calendar-sync] Synced ${syncedCount} Google events for user ${integration.user_id}`);
    return { success: true, synced: syncedCount };
  } catch (error) {
    console.error("[calendar-sync] Sync error:", error);
    return { success: false, error: error.message };
  }
}

async function syncOutlookIcal(integration: CalendarIntegration, supabase: any): Promise<{ success: boolean; error?: string; synced?: number }> {
  if (!integration.ical_url) {
    return { success: false, error: "No iCal URL configured" };
  }

  try {
    const response = await fetch(integration.ical_url);
    if (!response.ok) {
      return { success: false, error: `Failed to fetch iCal: ${response.status}` };
    }

    const icalText = await response.text();
    const events = parseICalEvents(icalText);

    let syncedCount = 0;

    // Get existing external IDs to detect deletions
    const { data: existingEvents } = await supabase
      .from("calendar_events")
      .select("external_id")
      .eq("user_id", integration.user_id)
      .eq("source", "outlook_ics");

    const existingIds = new Set((existingEvents || []).map((e: any) => e.external_id));
    const currentIds = new Set<string>();

    for (const event of events) {
      currentIds.add(event.uid);

      const eventData = {
        user_id: integration.user_id,
        title: event.summary || "Untitled Event",
        description: event.description || null,
        location: event.location || null,
        start_time: event.start,
        end_time: event.end,
        is_all_day: event.isAllDay,
        category: "meeting",
        color: "#0078d4", // Outlook blue
        source: "outlook_ics",
        external_id: event.uid,
        read_only: true,
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("calendar_events")
        .upsert(eventData, {
          onConflict: "user_id,source,external_id",
        });

      if (!error) {
        syncedCount++;
      }
    }

    // Delete events that no longer exist in the feed
    for (const existingId of existingIds) {
      if (!currentIds.has(existingId)) {
        await supabase
          .from("calendar_events")
          .delete()
          .eq("user_id", integration.user_id)
          .eq("source", "outlook_ics")
          .eq("external_id", existingId);
      }
    }

    await supabase
      .from("calendar_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "success",
        last_sync_error: null,
      })
      .eq("id", integration.id);

    console.log(`[calendar-sync] Synced ${syncedCount} Outlook iCal events for user ${integration.user_id}`);
    return { success: true, synced: syncedCount };
  } catch (error) {
    console.error("[calendar-sync] iCal sync error:", error);
    await supabase
      .from("calendar_integrations")
      .update({
        last_sync_status: "error",
        last_sync_error: error.message,
      })
      .eq("id", integration.id);
    return { success: false, error: error.message };
  }
}

interface ParsedEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  isAllDay: boolean;
}

function parseICalEvents(icalText: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = icalText.split(/\r?\n/);

  let currentEvent: Partial<ParsedEvent> | null = null;
  let currentField = "";
  let currentValue = "";

  for (const line of lines) {
    // Handle line continuation
    if (line.startsWith(" ") || line.startsWith("\t")) {
      currentValue += line.slice(1);
      continue;
    }

    // Process previous field if exists
    if (currentEvent && currentField) {
      processField(currentEvent, currentField, currentValue);
    }

    if (line === "BEGIN:VEVENT") {
      currentEvent = { isAllDay: false };
      currentField = "";
      currentValue = "";
    } else if (line === "END:VEVENT" && currentEvent) {
      if (currentEvent.uid && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as ParsedEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        currentField = line.slice(0, colonIndex);
        currentValue = line.slice(colonIndex + 1);
      }
    }
  }

  return events;
}

function processField(event: Partial<ParsedEvent>, field: string, value: string) {
  // Remove parameters from field name (e.g., DTSTART;VALUE=DATE -> DTSTART)
  const fieldName = field.split(";")[0];

  switch (fieldName) {
    case "UID":
      event.uid = value;
      break;
    case "SUMMARY":
      event.summary = unescapeIcalText(value);
      break;
    case "DESCRIPTION":
      event.description = unescapeIcalText(value);
      break;
    case "LOCATION":
      event.location = unescapeIcalText(value);
      break;
    case "DTSTART":
      if (field.includes("VALUE=DATE") || value.length === 8) {
        event.start = parseICalDate(value);
        event.isAllDay = true;
      } else {
        event.start = parseICalDateTime(value);
      }
      break;
    case "DTEND":
      if (field.includes("VALUE=DATE") || value.length === 8) {
        event.end = parseICalDate(value, true);
      } else {
        event.end = parseICalDateTime(value);
      }
      break;
  }
}

function parseICalDate(value: string, isEnd = false): string {
  // Format: YYYYMMDD
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  // For all-day end dates, iCal uses exclusive end, so the actual end is the day before
  const date = new Date(`${year}-${month}-${day}T${isEnd ? "23:59:59" : "00:00:00"}`);
  if (isEnd) {
    date.setDate(date.getDate() - 1);
  }
  return date.toISOString();
}

function parseICalDateTime(value: string): string {
  // Format: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const hour = value.slice(9, 11);
  const minute = value.slice(11, 13);
  const second = value.slice(13, 15) || "00";
  const isUtc = value.endsWith("Z");

  const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}${isUtc ? "Z" : ""}`;
  return new Date(dateStr).toISOString();
}

function unescapeIcalText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

// Push event to Google Calendar (2-way sync)
async function pushEventToGoogle(
  integration: CalendarIntegration,
  event: any,
  action: "create" | "update" | "delete"
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const accessToken = await getValidAccessToken(integration);
  if (!accessToken) {
    return { success: false, error: "Failed to get valid access token" };
  }

  try {
    const baseUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

    if (action === "delete" && event.external_id) {
      const response = await fetch(`${baseUrl}/${event.external_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { success: response.ok || response.status === 404 };
    }

    const googleEvent = {
      summary: event.title,
      description: event.description || "",
      location: event.location || "",
      start: event.is_all_day
        ? { date: event.start_time.split("T")[0] }
        : { dateTime: event.start_time, timeZone: "UTC" },
      end: event.is_all_day
        ? { date: event.end_time.split("T")[0] }
        : { dateTime: event.end_time, timeZone: "UTC" },
    };

    let response: Response;
    if (action === "update" && event.external_id) {
      response = await fetch(`${baseUrl}/${event.external_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      });
    } else {
      response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[calendar-sync] Push to Google failed:", errorText);
      return { success: false, error: `Google API error: ${response.status}` };
    }

    const result = await response.json();
    return { success: true, externalId: result.id };
  } catch (error) {
    console.error("[calendar-sync] Push to Google error:", error);
    return { success: false, error: error.message };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { action, userId, provider, event, eventAction } = await req.json();

    // Sync all calendars for a user
    if (action === "sync") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: integrations, error } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_id", userId)
        .eq("enabled", true);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Record<string, any> = {};

      for (const integration of integrations || []) {
        if (integration.provider === "google") {
          results.google = await syncGoogleCalendar(integration, supabase);
        } else if (integration.provider === "outlook_ics") {
          results.outlook_ics = await syncOutlookIcal(integration, supabase);
        }
      }

      console.log(`[calendar-sync] Sync completed for user ${userId}:`, results);

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sync specific provider
    if (action === "sync_provider" && provider) {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: integration, error } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", provider)
        .eq("enabled", true)
        .single();

      if (error || !integration) {
        return new Response(JSON.stringify({ error: "Integration not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let result;
      if (provider === "google") {
        result = await syncGoogleCalendar(integration, supabase);
      } else if (provider === "outlook_ics") {
        result = await syncOutlookIcal(integration, supabase);
      } else {
        return new Response(JSON.stringify({ error: "Unknown provider" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Push event to external calendar (2-way sync for Google)
    if (action === "push_event" && event && eventAction) {
      const { data: integration, error } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_id", event.user_id)
        .eq("provider", "google")
        .eq("enabled", true)
        .single();

      if (error || !integration) {
        // No Google integration, that's fine
        return new Response(JSON.stringify({ success: true, message: "No Google integration" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await pushEventToGoogle(integration, event, eventAction);

      if (result.success && result.externalId && eventAction !== "delete") {
        // Update the event with the external ID
        await supabase
          .from("calendar_events")
          .update({
            external_id: result.externalId,
            source: "google",
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", event.id);
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[calendar-sync] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

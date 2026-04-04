import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  verifyArloJWT, 
  handleCorsOptions,
  validateOrigin,
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse 
} from '../_shared/arloAuth.ts'
import { encrypt, decrypt, isEncrypted } from '../_shared/encryption.ts'
import { checkAuthRateLimit, AUTH_RATE_LIMITS, logAuthFailure } from '../_shared/authRateLimit.ts'

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
  user_key: string; // TEXT identifier from JWT.sub
  provider: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  sync_cursor?: string;
  ical_url?: string;
}

async function refreshGoogleToken(integration: CalendarIntegration): Promise<string | null> {
  try {
    // Decrypt the refresh token
    const decryptedRefreshToken = await decrypt(integration.refresh_token);
    
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: decryptedRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("[calendar-sync] Token refresh error:", data);
      return null;
    }

    // Update token in database - encrypt the new access token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    const encryptedAccessToken = await encrypt(data.access_token);

    await supabase
      .from("calendar_integrations")
      .update({
        access_token: encryptedAccessToken,
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

  // Decrypt and return the access token
  return await decrypt(integration.access_token);
}

interface CalendarSelection {
  id: string;
  integration_id: string;
  calendar_id: string;
  calendar_name: string;
  calendar_color: string;
  enabled: boolean;
  sync_cursor?: string;
}

async function syncGoogleCalendar(integration: CalendarIntegration, supabase: any): Promise<{ success: boolean; error?: string; synced?: number }> {
  const accessToken = await getValidAccessToken(integration);
  if (!accessToken) {
    return { success: false, error: "Failed to get valid access token" };
  }

  try {
    // Get selected calendars for this integration
    const { data: selections } = await supabase
      .from("google_calendar_selections")
      .select("*")
      .eq("integration_id", integration.id)
      .eq("enabled", true);

    // If no selections, sync primary calendar only (backward compatible)
    const calendarsToSync: Array<{ id: string; name: string; color: string; syncCursor?: string; selectionId?: string }> = 
      selections && selections.length > 0
        ? selections.map((s: CalendarSelection) => ({
            id: s.calendar_id,
            name: s.calendar_name,
            color: s.calendar_color,
            syncCursor: s.sync_cursor,
            selectionId: s.id,
          }))
        : [{ id: "primary", name: "Primary", color: "#4285f4", syncCursor: integration.sync_cursor }];

    let totalSynced = 0;

    for (const cal of calendarsToSync) {
      const calendarUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`);
      
      // If we have a sync token, use it for incremental sync (can't use with timeMin/timeMax)
      if (cal.syncCursor) {
        calendarUrl.searchParams.set("syncToken", cal.syncCursor);
      } else {
        // Full sync: fetch events from the last 30 days to next 90 days
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        calendarUrl.searchParams.set("timeMin", timeMin);
        calendarUrl.searchParams.set("timeMax", timeMax);
      }
      
      calendarUrl.searchParams.set("singleEvents", "true");
      calendarUrl.searchParams.set("maxResults", "500");

      const response = await fetch(calendarUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        // If sync token is invalid, clear it and retry
        if (response.status === 410 && cal.syncCursor) {
          console.log(`[calendar-sync] Sync token expired for calendar ${cal.name}, doing full sync`);
          if (cal.selectionId) {
            await supabase
              .from("google_calendar_selections")
              .update({ sync_cursor: null })
              .eq("id", cal.selectionId);
          } else {
            await supabase
              .from("calendar_integrations")
              .update({ sync_cursor: null })
              .eq("id", integration.id);
          }
          // Retry without sync token
          continue;
        }
        const errorText = await response.text();
        console.error(`[calendar-sync] Google API error for calendar ${cal.name}:`, errorText);
        continue;
      }

      const data = await response.json();
      const events: GoogleEvent[] = data.items || [];

      for (const event of events) {
        // Use calendar ID + event ID as external_id to avoid conflicts across calendars
        const externalId = `${cal.id}::${event.id}`;
        
        if (event.status === "cancelled") {
          // Delete cancelled events using user_key
          await supabase
            .from("calendar_events")
            .delete()
            .eq("user_key", integration.user_key)
            .eq("source", "google")
            .eq("external_id", externalId);
          continue;
        }

        const isAllDay = !event.start.dateTime;
        const startTime = event.start.dateTime || `${event.start.date}T00:00:00`;
        const endTime = event.end.dateTime || `${event.end.date}T23:59:59`;

        const eventData = {
          user_key: integration.user_key, // Use TEXT identifier
          title: event.summary || "Untitled Event",
          description: event.description || null,
          location: event.location || null,
          start_time: startTime,
          end_time: endTime,
          is_all_day: isAllDay,
          category: "meeting",
          color: cal.color, // Use the calendar's color
          source: "google",
          external_id: externalId,
          read_only: false,
          last_synced_at: new Date().toISOString(),
        };

        // Check if event already exists using user_key
        const { data: existing } = await supabase
          .from("calendar_events")
          .select("id")
          .eq("user_key", integration.user_key)
          .eq("source", "google")
          .eq("external_id", externalId)
          .maybeSingle();

        let upsertError;
        if (existing) {
          const { error: updateError } = await supabase
            .from("calendar_events")
            .update(eventData)
            .eq("id", existing.id);
          upsertError = updateError;
        } else {
          const { error: insertError } = await supabase
            .from("calendar_events")
            .insert(eventData);
          upsertError = insertError;
        }

        if (upsertError) {
          console.error("[calendar-sync] Error syncing event:", upsertError);
        } else {
          totalSynced++;
        }
      }

      // Save sync token for this calendar
      if (data.nextSyncToken) {
        if (cal.selectionId) {
          await supabase
            .from("google_calendar_selections")
            .update({ sync_cursor: data.nextSyncToken })
            .eq("id", cal.selectionId);
        } else {
          await supabase
            .from("calendar_integrations")
            .update({ sync_cursor: data.nextSyncToken })
            .eq("id", integration.id);
        }
      }

      console.log(`[calendar-sync] Synced ${events.length} events from Google calendar "${cal.name}"`);
    }

    // Update integration sync status
    await supabase
      .from("calendar_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "success",
        last_sync_error: null,
      })
      .eq("id", integration.id);

    console.log(`[calendar-sync] Synced ${totalSynced} total Google events for user_key ${integration.user_key}`);
    return { success: true, synced: totalSynced };
  } catch (error: unknown) {
    console.error("[calendar-sync] Sync error:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function syncOutlookIcal(integration: CalendarIntegration, supabase: any): Promise<{ success: boolean; error?: string; synced?: number }> {
  if (!integration.ical_url) {
    return { success: false, error: "No iCal URL configured" };
  }

  try {
    // Decrypt the iCal URL if it's encrypted
    const decryptedIcalUrl = await decrypt(integration.ical_url);
    console.log(`[calendar-sync] Fetching Outlook iCal from: ${decryptedIcalUrl.substring(0, 50)}...`);
    
    const response = await fetch(decryptedIcalUrl);
    if (!response.ok) {
      console.error(`[calendar-sync] Failed to fetch iCal: ${response.status} ${response.statusText}`);
      return { success: false, error: `Failed to fetch iCal: ${response.status}` };
    }

    const icalText = await response.text();
    console.log(`[calendar-sync] Received iCal data, length: ${icalText.length} chars`);
    
    const events = parseICalEvents(icalText);
    console.log(`[calendar-sync] Parsed ${events.length} events from iCal feed`);

    let syncedCount = 0;
    let errorCount = 0;

    // Get existing external IDs to detect deletions using user_key
    const { data: existingEvents } = await supabase
      .from("calendar_events")
      .select("external_id")
      .eq("user_key", integration.user_key)
      .eq("source", "outlook_ics");

    const existingIds = new Set<string>((existingEvents || []).map((e: any) => e.external_id));
    const currentIds = new Set<string>();

    for (const event of events) {
      currentIds.add(event.uid);

      const eventData = {
        user_key: integration.user_key, // Use TEXT identifier
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

      // Check if event already exists using user_key
      const { data: existing } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("user_key", integration.user_key)
        .eq("source", "outlook_ics")
        .eq("external_id", event.uid)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from("calendar_events")
          .update(eventData)
          .eq("id", existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("calendar_events")
          .insert(eventData);
        error = insertError;
      }

      if (error) {
        console.error(`[calendar-sync] Error syncing event "${event.summary}":`, error);
        errorCount++;
      } else {
        syncedCount++;
      }
    }

    // Delete events that no longer exist in the feed using user_key
    for (const existingId of existingIds) {
      if (!currentIds.has(existingId)) {
        await supabase
          .from("calendar_events")
          .delete()
          .eq("user_key", integration.user_key)
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

    console.log(`[calendar-sync] Synced ${syncedCount} Outlook iCal events (${errorCount} errors) for user_key ${integration.user_key}`);
    return { success: true, synced: syncedCount };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[calendar-sync] iCal sync error:", error);
    await supabase
      .from("calendar_integrations")
      .update({
        last_sync_status: "error",
        last_sync_error: errMsg,
      })
      .eq("id", integration.id);
    return { success: false, error: errMsg };
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
  // Remove parameters from field name
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
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}T${isEnd ? "23:59:59" : "00:00:00"}`);
  if (isEnd) {
    date.setDate(date.getDate() - 1);
  }
  return date.toISOString();
}

function parseICalDateTime(value: string): string {
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const hour = value.slice(9, 11);
  const minute = value.slice(11, 13);
  const second = value.slice(13, 15) || "00";

  if (value.endsWith("Z")) {
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
  }
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
}

function unescapeIcalText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

async function pushEventToGoogle(
  integration: CalendarIntegration,
  event: any,
  action: "create" | "update" | "delete"
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const accessToken = await getValidAccessToken(integration);
  if (!accessToken) {
    return { success: false, error: "Failed to get access token" };
  }

  try {
    const calendarId = "primary";
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

    if (action === "delete" && event.external_id) {
      const eventId = event.external_id.split("::")[1] || event.external_id;
      const response = await fetch(`${baseUrl}/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        return { success: false, error };
      }
      return { success: true };
    }

    const googleEvent = {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: event.is_all_day
        ? { date: event.start_time.split("T")[0] }
        : { dateTime: event.start_time },
      end: event.is_all_day
        ? { date: event.end_time.split("T")[0] }
        : { dateTime: event.end_time },
    };

    if (action === "update" && event.external_id) {
      const eventId = event.external_id.split("::")[1] || event.external_id;
      const response = await fetch(`${baseUrl}/${eventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();
      return { success: true, externalId: `primary::${data.id}` };
    }

    // Create new event
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleEvent),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, externalId: `primary::${data.id}` };
  } catch (error) {
    console.error("[calendar-sync] Push event error:", error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  // Validate origin for non-preflight requests
  const originError = validateOrigin(req);
  if (originError) return originError;

  try {
    // Rate limit calendar sync requests
    const rateLimitResponse = checkAuthRateLimit(req, AUTH_RATE_LIMITS.calendarSync);
    if (rateLimitResponse) return rateLimitResponse;

    // Verify JWT authentication
    const authResult = await verifyArloJWT(req);
    
    if (!authResult.authenticated) {
      logAuthFailure(req, `calendar-sync: ${authResult.error}`);
      console.log('[calendar-sync] Authentication failed:', authResult.error);
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    // userKey is derived from JWT.sub - TEXT identifier (email/tailnet)
    const userKey = authResult.userId;
    console.log('[calendar-sync] Authenticated user_key (from JWT.sub):', userKey);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action } = body;

    // Sync all enabled integrations using user_key
    if (action === "sync") {
      const { data: integrations, error: fetchError } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_key", userKey)
        .eq("enabled", true);

      if (fetchError) {
        console.error("[calendar-sync] Error fetching integrations:", fetchError);
        return errorResponse(req, "Failed to fetch integrations", 500);
      }

      const results: { provider: string; success: boolean; synced?: number; error?: string }[] = [];

      for (const integration of integrations || []) {
        let result;
        if (integration.provider === "google") {
          result = await syncGoogleCalendar(integration, supabase);
        } else if (integration.provider === "outlook_ics") {
          result = await syncOutlookIcal(integration, supabase);
        } else {
          continue;
        }

        results.push({
          provider: integration.provider,
          ...result,
        });
      }

      console.log("[calendar-sync] Sync complete:", results);
      return jsonResponse(req, { success: true, results });
    }

    // Sync a specific provider using user_key
    if (action === "sync_provider") {
      const { provider } = body;
      
      const { data: integration, error: fetchError } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_key", userKey)
        .eq("provider", provider)
        .single();

      if (fetchError || !integration) {
        console.log("[calendar-sync] Integration not found for user_key:", userKey, "provider:", provider);
        return errorResponse(req, "Integration not found", 404);
      }

      let result;
      if (provider === "google") {
        result = await syncGoogleCalendar(integration, supabase);
      } else if (provider === "outlook_ics") {
        result = await syncOutlookIcal(integration, supabase);
      } else {
        return errorResponse(req, "Unknown provider", 400);
      }

      return jsonResponse(req, result);
    }

    // Push event to Google Calendar (2-way sync) using user_key
    if (action === "push_event") {
      const { event, eventAction } = body;

      const { data: integration, error: fetchError } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_key", userKey)
        .eq("provider", "google")
        .single();

      if (fetchError || !integration) {
        return errorResponse(req, "Google Calendar not connected", 400);
      }

      const result = await pushEventToGoogle(integration, event, eventAction);
      
      if (result.success && result.externalId && eventAction === "create") {
        // Update the local event with the external ID
        await supabase
          .from("calendar_events")
          .update({ 
            external_id: result.externalId,
            source: "google",
          })
          .eq("id", event.id);
      }

      return jsonResponse(req, result);
    }

    // Push task to Google Calendar (task-calendar sync)
    if (action === "push_task") {
      const { task, taskAction } = body;

      const { data: integration, error: fetchError } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_key", userKey)
        .eq("provider", "google")
        .single();

      if (fetchError || !integration) {
        // No Google Calendar connected - silently skip
        return jsonResponse(req, { success: false, error: "Google Calendar not connected" });
      }

      // Use the same push function but mark the event source as arlo_task
      const taskEvent = {
        ...task,
        external_id: task.external_id ? `task::${task.external_id}` : null,
      };

      const result = await pushEventToGoogle(integration, taskEvent, taskAction);
      
      return jsonResponse(req, result);
    }

    return errorResponse(req, "Invalid action", 400);
  } catch (error) {
    console.error("[calendar-sync] Error:", error);
    return errorResponse(req, error instanceof Error ? error.message : "Unknown error", 500);
  }
});

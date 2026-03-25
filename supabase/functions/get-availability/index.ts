import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  checkRateLimit, 
  getClientIP, 
  rateLimitResponse, 
  RATE_LIMITS 
} from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-arlo-authorization, x-client-info, apikey, content-type, x-user-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AvailabilityRequest {
  handle?: string;
  date: string; // YYYY-MM-DD
  timezone?: string;
  durationMinutes?: number;
}

interface TimeSlot {
  time: string; // e.g., "9:00 AM"
  available: boolean;
}

// Default availability: Mon-Fri, 9:00 AM - 4:00 PM
const DEFAULT_AVAILABILITY = {
  startHour: 9,
  endHour: 16, // 4 PM
  daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  slotDurationMinutes: 30,
};

// Host user key - uses TEXT-based user_key column
const HOST_USER_KEY = "jacobtart8@gmail.com";

function parseTime12to24(time12: string): { hours: number; minutes: number } {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 0, minutes: 0 };

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

function format12Hour(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  const displayMin = minutes.toString().padStart(2, "0");
  return `${displayHour}:${displayMin} ${period}`;
}

// Get timezone offset in minutes for a given timezone and date
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);
  } catch {
    // Default to EST (-5 hours = -300 minutes)
    return -300;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(clientIP, RATE_LIMITS.availability);
  
  if (!rateCheck.allowed) {
    console.log(`[get-availability] Rate limited IP: ${clientIP.substring(0, 8)}***`);
    return rateLimitResponse(rateCheck, corsHeaders);
  }

  try {
    const { handle, date, timezone, durationMinutes }: AvailabilityRequest = await req.json();

    if (!date) {
      return new Response(JSON.stringify({ error: "Date is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return new Response(JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user by handle (for now, use a default user lookup)
    let userKey = HOST_USER_KEY;

    // Try to find user settings or use default
    const { data: userData } = await supabase
      .from("user_settings")
      .select("user_key")
      .not("user_key", "is", null)
      .limit(1)
      .maybeSingle();

    if (userData?.user_key) {
      userKey = userData.user_key;
    }

    // Use host timezone (America/New_York) for availability calculations
    const hostTimezone = timezone || "America/New_York";
    
    const requestedDate = new Date(date + "T12:00:00"); // Use noon to avoid date boundary issues
    const dayOfWeek = requestedDate.getDay();

    // Check if it's a weekday
    if (!DEFAULT_AVAILABILITY.daysOfWeek.includes(dayOfWeek)) {
      return new Response(JSON.stringify({ slots: [], reason: "Weekend" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if it's a US holiday
    const { data: holiday } = await supabase
      .from("us_holidays")
      .select("name")
      .eq("date", date)
      .maybeSingle();

    if (holiday) {
      return new Response(JSON.stringify({ slots: [], reason: `Holiday: ${holiday.name}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate UTC time range for the requested date in host timezone
    // We need to query events that fall within 9 AM - 4 PM in the host's timezone
    const tzOffset = getTimezoneOffsetMinutes(hostTimezone, requestedDate);
    
    // Start of availability window in UTC (9 AM local = 9 AM + offset in UTC)
    const availStartLocal = DEFAULT_AVAILABILITY.startHour * 60; // 9:00 AM = 540 minutes
    const availEndLocal = DEFAULT_AVAILABILITY.endHour * 60; // 4:00 PM = 960 minutes
    
    // Convert local times to UTC for querying
    const availStartUTC = availStartLocal + tzOffset;
    const availEndUTC = availEndLocal + tzOffset;
    
    // Build UTC timestamps for the query
    // We add a buffer to catch events that might span into or out of the availability window
    const queryStartHour = Math.floor((availStartUTC - 60) / 60);
    const queryEndHour = Math.ceil((availEndUTC + 60) / 60);
    
    const startOfDay = `${date}T${String(Math.max(0, queryStartHour)).padStart(2, '0')}:00:00Z`;
    const endOfDay = `${date}T${String(Math.min(23, queryEndHour)).padStart(2, '0')}:59:59Z`;

    console.log(`[get-availability] Querying events for ${userKey} on ${date}, UTC range: ${startOfDay} to ${endOfDay}`);

    const { data: events, error: eventsError } = await supabase
      .from("calendar_events")
      .select("start_time, end_time, is_all_day, source, title")
      .eq("user_key", userKey)
      .or(`and(start_time.lte.${endOfDay},end_time.gte.${startOfDay}),is_all_day.eq.true`);

    if (eventsError) {
      console.error("[get-availability] Error fetching events:", eventsError);
    }

    console.log(`[get-availability] Found ${events?.length || 0} events`);

    // Build busy time intervals (in local minutes from midnight)
    const busyIntervals: Array<{ start: number; end: number; title?: string }> = [];

    for (const event of events || []) {
      // Skip events that don't match the requested date (for non-all-day events)
      if (!event.is_all_day) {
        const eventStartDate = event.start_time.slice(0, 10);
        const eventEndDate = event.end_time.slice(0, 10);
        
        // Check if event overlaps with requested date
        if (eventEndDate < date && eventStartDate < date) {
          continue;
        }
      }

      if (event.is_all_day) {
        // All-day event blocks entire availability window
        busyIntervals.push({ start: 0, end: 24 * 60, title: event.title });
        console.log(`[get-availability] All-day event blocks day: ${event.title}`);
        continue;
      }

      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      // Convert UTC times to local timezone minutes from midnight
      // Get hours and minutes in the host timezone
      const startInTz = new Date(eventStart.toLocaleString('en-US', { timeZone: hostTimezone }));
      const endInTz = new Date(eventEnd.toLocaleString('en-US', { timeZone: hostTimezone }));
      
      const startLocalMinutes = startInTz.getHours() * 60 + startInTz.getMinutes();
      const endLocalMinutes = endInTz.getHours() * 60 + endInTz.getMinutes();

      // Check if the event's local date matches the requested date
      const eventLocalDate = startInTz.toISOString().slice(0, 10);
      const eventEndLocalDate = endInTz.toISOString().slice(0, 10);
      
      // Handle events that span the requested date
      let intervalStart = startLocalMinutes;
      let intervalEnd = endLocalMinutes;

      // If event starts before the requested date, start from midnight
      if (eventLocalDate < date) {
        intervalStart = 0;
      }
      
      // If event ends after the requested date, end at midnight
      if (eventEndLocalDate > date) {
        intervalEnd = 24 * 60;
      }

      // Only add if the interval overlaps with our availability window
      if (intervalEnd > availStartLocal && intervalStart < availEndLocal) {
        busyIntervals.push({
          start: intervalStart,
          end: intervalEnd,
          title: event.title
        });
        console.log(`[get-availability] Busy interval: ${intervalStart}-${intervalEnd} (${event.title})`);
      }
    }

    // Merge overlapping intervals
    busyIntervals.sort((a, b) => a.start - b.start);
    const mergedBusy: Array<{ start: number; end: number }> = [];

    for (const interval of busyIntervals) {
      if (mergedBusy.length === 0) {
        mergedBusy.push({ start: interval.start, end: interval.end });
      } else {
        const last = mergedBusy[mergedBusy.length - 1];
        if (interval.start <= last.end) {
          last.end = Math.max(last.end, interval.end);
        } else {
          mergedBusy.push({ start: interval.start, end: interval.end });
        }
      }
    }

    console.log(`[get-availability] Merged busy intervals:`, mergedBusy);

    // Generate available slots
    const slotDuration = durationMinutes || DEFAULT_AVAILABILITY.slotDurationMinutes;
    const slots: TimeSlot[] = [];

    let currentMinutes = DEFAULT_AVAILABILITY.startHour * 60; // 9 AM = 540 minutes
    const endMinutes = DEFAULT_AVAILABILITY.endHour * 60; // 4 PM = 960 minutes

    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStart = currentMinutes;
      const slotEnd = currentMinutes + slotDuration;

      // Check if this slot overlaps with any busy interval
      const isAvailable = !mergedBusy.some(
        (busy) => slotStart < busy.end && slotEnd > busy.start
      );

      if (isAvailable) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        slots.push({
          time: format12Hour(hours, minutes),
          available: true,
        });
      }

      currentMinutes += slotDuration;
    }

    // Check if date is in the past
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (date < todayStr) {
      return new Response(JSON.stringify({ slots: [], reason: "Past date" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If today, filter out past times based on host timezone
    if (date === todayStr) {
      const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: hostTimezone }));
      const currentTimeMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();

      const filteredSlots = slots.filter((slot) => {
        const { hours, minutes } = parseTime12to24(slot.time);
        return hours * 60 + minutes > currentTimeMinutes;
      });

      console.log(`[get-availability] Returning ${filteredSlots.length} slots for today (${date}), filtered from ${slots.length}`);

      return new Response(JSON.stringify({ slots: filteredSlots }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[get-availability] Returning ${slots.length} available slots for ${date}`);

    return new Response(JSON.stringify({ slots }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[get-availability] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

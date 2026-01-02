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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Host user key - now uses TEXT-based user_key column instead of UUID
const HOST_USER_KEY = "jacobtart8@gmail.com"; // Default host email

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
    // In production, you'd look up the user by their booking handle
    let userKey = HOST_USER_KEY;

    // Try to find user settings or use default (using TEXT user_key column)
    const { data: userData } = await supabase
      .from("user_settings")
      .select("user_key")
      .not("user_key", "is", null)
      .limit(1)
      .single();

    if (userData?.user_key) {
      userKey = userData.user_key;
    }

    const requestedDate = new Date(date + "T00:00:00");
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
      .single();

    if (holiday) {
      return new Response(JSON.stringify({ slots: [], reason: `Holiday: ${holiday.name}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all events for this date (from all sources)
    const startOfDay = `${date}T00:00:00Z`;
    const endOfDay = `${date}T23:59:59Z`;

    const { data: events, error: eventsError } = await supabase
      .from("calendar_events")
      .select("start_time, end_time, is_all_day, source")
      .eq("user_key", userKey)
      .gte("end_time", startOfDay)
      .lte("start_time", endOfDay);

    if (eventsError) {
      console.error("[get-availability] Error fetching events:", eventsError);
    }

    // Build busy time intervals
    const busyIntervals: Array<{ start: number; end: number }> = [];

    for (const event of events || []) {
      if (event.is_all_day) {
        // All-day event blocks entire day
        busyIntervals.push({ start: 0, end: 24 * 60 });
        continue;
      }

      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      // Convert to minutes from midnight
      const startMinutes = eventStart.getUTCHours() * 60 + eventStart.getUTCMinutes();
      const endMinutes = eventEnd.getUTCHours() * 60 + eventEnd.getUTCMinutes();

      // Handle events that span midnight
      if (eventStart.toISOString().slice(0, 10) === date) {
        busyIntervals.push({
          start: startMinutes,
          end: eventEnd.toISOString().slice(0, 10) === date ? endMinutes : 24 * 60,
        });
      } else if (eventEnd.toISOString().slice(0, 10) === date) {
        busyIntervals.push({
          start: 0,
          end: endMinutes,
        });
      }
    }

    // Merge overlapping intervals
    busyIntervals.sort((a, b) => a.start - b.start);
    const mergedBusy: Array<{ start: number; end: number }> = [];

    for (const interval of busyIntervals) {
      if (mergedBusy.length === 0) {
        mergedBusy.push(interval);
      } else {
        const last = mergedBusy[mergedBusy.length - 1];
        if (interval.start <= last.end) {
          last.end = Math.max(last.end, interval.end);
        } else {
          mergedBusy.push(interval);
        }
      }
    }

    // Generate available slots
    const slotDuration = durationMinutes || DEFAULT_AVAILABILITY.slotDurationMinutes;
    const slots: TimeSlot[] = [];

    let currentMinutes = DEFAULT_AVAILABILITY.startHour * 60;
    const endMinutes = DEFAULT_AVAILABILITY.endHour * 60;

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

    // If today, filter out past times
    if (date === todayStr) {
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMin;

      const filteredSlots = slots.filter((slot) => {
        const { hours, minutes } = parseTime12to24(slot.time);
        return hours * 60 + minutes > currentTimeMinutes;
      });

      return new Response(JSON.stringify({ slots: filteredSlots }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[get-availability] Returning ${slots.length} slots for ${date}`);

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

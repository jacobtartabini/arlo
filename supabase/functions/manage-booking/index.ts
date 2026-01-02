import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";
import { 
  validateManageBookingInput, 
  validateEmail,
  validationErrorResponse,
  type ManageBookingInput 
} from '../_shared/validation.ts';
import { 
  checkRateLimit, 
  getClientIP, 
  rateLimitResponse, 
  hashForLogging,
  RATE_LIMITS 
} from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a date in a specific timezone
function createDateInTimezone(dateStr: string, hours: number, minutes: number, timezone: string): Date {
  // Extract just the date part (YYYY-MM-DD)
  const datePart = dateStr.split('T')[0];
  
  // Create an ISO string with the exact time we want
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  
  // For US Eastern timezone, calculate offset
  const offsetMap: Record<string, number> = {
    'America/New_York': -5,
    'America/Chicago': -6,
    'America/Denver': -7,
    'America/Los_Angeles': -8,
    'UTC': 0,
  };
  
  const offset = offsetMap[timezone] ?? -5; // Default to EST
  
  // Create date assuming the input is in the specified timezone
  const localDate = new Date(`${datePart}T${timeStr}`);
  const utcDate = new Date(localDate.getTime() - (offset * 60 * 60 * 1000));
  
  return utcDate;
}

function parseTimeToHours(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes };
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTimeForDisplay(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting by IP
  const clientIP = getClientIP(req);
  const ipRateCheck = checkRateLimit(clientIP, RATE_LIMITS.manageBooking);
  
  if (!ipRateCheck.allowed) {
    console.log(`[manage-booking] Rate limited IP: ${hashForLogging(clientIP)}`);
    return rateLimitResponse(ipRateCheck, corsHeaders);
  }

  try {
    const rawInput = await req.json();

    // Validate all input using the shared validation module
    const validation = validateManageBookingInput(rawInput);
    if (!validation.success) {
      console.error("[manage-booking] Validation failed:", validation.error, validation.errors);
      return validationErrorResponse(validation.error!, validation.errors, corsHeaders);
    }

    const { eventId, action, newDate, newTime, email, timezone } = validation.data!;

    console.log("[manage-booking] Validated request:", { eventId, action, email: email ? hashForLogging(email) : undefined, timezone });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the event
    const { data: event, error: fetchError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      console.error("[manage-booking] Event not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract guest email from description for verification
    const emailMatch = event.description?.match(/\(([^)]+@[^)]+)\)/);
    const guestEmail = emailMatch ? emailMatch[1] : null;
    const guestNameMatch = event.description?.match(/Booked by: ([^(]+)/);
    const guestName = guestNameMatch ? guestNameMatch[1].trim() : "Guest";

    switch (action) {
      case "get": {
        // Return event details (without requiring email verification for viewing)
        return new Response(
          JSON.stringify({
            data: {
              id: event.id,
              title: event.title,
              start_time: event.start_time,
              end_time: event.end_time,
              description: event.description,
              category: event.category,
              guestName,
              guestEmail: guestEmail ? `${guestEmail.substring(0, 3)}***@${guestEmail.split("@")[1]}` : null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "reschedule": {
        // Validation already ensures email, newDate, newTime are present for reschedule action
        
        // Verify email matches the booking
        if (email!.toLowerCase() !== guestEmail?.toLowerCase()) {
          return new Response(
            JSON.stringify({ error: "Email verification failed. Please use the email address you used when booking." }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Parse new time using client timezone (already validated)
        const { hours, minutes } = parseTimeToHours(newTime!);
        const clientTimezone = timezone || 'America/New_York';
        const newStartDate = createDateInTimezone(newDate!, hours, minutes, clientTimezone);
        const newEndDate = new Date(newStartDate.getTime() + 30 * 60 * 1000);

        console.log("[manage-booking] Rescheduling:", { 
          newDate, 
          newTime, 
          timezone: clientTimezone,
          newStartDateUTC: newStartDate.toISOString() 
        });

        // Update the event
        const { error: updateError } = await supabase
          .from("calendar_events")
          .update({
            start_time: newStartDate.toISOString(),
            end_time: newEndDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", eventId);

        if (updateError) {
          console.error("[manage-booking] Update error:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to reschedule booking" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Send confirmation email
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey && guestEmail) {
          try {
            const resend = new Resend(resendApiKey);
            await resend.emails.send({
              from: "Arlo Calendar <calendar@jacobtartabini.com>",
              to: [guestEmail],
              subject: `Meeting Rescheduled - ${formatDateForDisplay(newStartDate)} at ${newTime}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #111827;">Meeting Rescheduled</h2>
                  <p>Hi ${guestName},</p>
                  <p>Your meeting has been rescheduled to:</p>
                  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 4px 0;"><strong>Date:</strong> ${formatDateForDisplay(newStartDate)}</p>
                    <p style="margin: 4px 0;"><strong>Time:</strong> ${newTime}</p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">If you need to make further changes, please reply to this email.</p>
                </div>
              `,
            });
          } catch (emailError) {
            console.error("[manage-booking] Email error:", emailError);
          }
        }

        console.log("[manage-booking] Booking rescheduled successfully");
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Booking rescheduled successfully",
            newStartTime: newStartDate.toISOString(),
            newEndTime: newEndDate.toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "cancel": {
        // Validation already ensures email is present for cancel action
        
        // Verify email matches the booking
        if (email!.toLowerCase() !== guestEmail?.toLowerCase()) {
          return new Response(
            JSON.stringify({ error: "Email verification failed. Please use the email address you used when booking." }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const eventStartTime = new Date(event.start_time);

        // Delete the event
        const { error: deleteError } = await supabase
          .from("calendar_events")
          .delete()
          .eq("id", eventId);

        if (deleteError) {
          console.error("[manage-booking] Delete error:", deleteError);
          return new Response(
            JSON.stringify({ error: "Failed to cancel booking" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Send cancellation email
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey && guestEmail) {
          try {
            const resend = new Resend(resendApiKey);
            await resend.emails.send({
              from: "Arlo Calendar <calendar@jacobtartabini.com>",
              to: [guestEmail],
              subject: "Meeting Cancelled",
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #111827;">Meeting Cancelled</h2>
                  <p>Hi ${guestName},</p>
                  <p>Your meeting scheduled for ${formatDateForDisplay(eventStartTime)} at ${formatTimeForDisplay(eventStartTime)} has been cancelled.</p>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                    If you'd like to book a new meeting, visit our booking page.
                  </p>
                </div>
              `,
            });
          } catch (emailError) {
            console.error("[manage-booking] Email error:", emailError);
          }
        }

        // Create notification for the host
        await supabase.from("notifications").insert({
          user_id: event.user_id,
          title: "Meeting Cancelled",
          content: `${guestName} has cancelled their meeting scheduled for ${formatDateForDisplay(eventStartTime)} at ${formatTimeForDisplay(eventStartTime)}`,
          source: "calendar",
        });

        console.log("[manage-booking] Booking cancelled successfully");
        return new Response(
          JSON.stringify({ success: true, message: "Booking cancelled successfully" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
  } catch (error: any) {
    console.error("[manage-booking] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

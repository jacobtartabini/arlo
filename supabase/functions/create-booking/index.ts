import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingRequest {
  date: string; // ISO date string
  time: string; // e.g., "10:00 AM"
  name: string;
  email: string;
  message?: string;
  handle?: string;
}

function parseTimeToHours(timeStr: string): { hours: number; minutes: number } {
  // Parse time like "10:00 AM" or "2:30 PM"
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date, time, name, email, message, handle }: BookingRequest = await req.json();

    console.log("[create-booking] Received booking request:", { date, time, name, email, handle });

    // Validate required fields
    if (!date || !time || !name || !email) {
      console.error("[create-booking] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: date, time, name, and email are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    if (!email.includes("@")) {
      console.error("[create-booking] Invalid email format");
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse the time
    const { hours, minutes } = parseTimeToHours(time);
    
    // Create start and end times (default 30 min meeting)
    const startDate = new Date(date);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);

    // Create Supabase client with service role for inserting
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[create-booking] Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // For public bookings, we'll use a system user ID or the first user
    // In production, you'd want to look up the user by their handle
    const { data: users, error: userError } = await supabase
      .from("user_settings")
      .select("user_id")
      .limit(1);

    if (userError) {
      console.error("[create-booking] Error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to find booking recipient" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = users?.[0]?.user_id;
    
    if (!userId) {
      console.error("[create-booking] No user found for booking");
      return new Response(
        JSON.stringify({ error: "No user available for booking" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create calendar event
    const eventTitle = `Meeting with ${name}`;
    const eventDescription = message 
      ? `Booked by: ${name} (${email})\n\nMessage: ${message}`
      : `Booked by: ${name} (${email})`;

    const { data: calendarEvent, error: eventError } = await supabase
      .from("calendar_events")
      .insert({
        user_id: userId,
        title: eventTitle,
        description: eventDescription,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        category: "meeting",
        color: "#3b82f6",
        is_all_day: false,
      })
      .select()
      .single();

    if (eventError) {
      console.error("[create-booking] Error creating calendar event:", eventError);
      return new Response(
        JSON.stringify({ error: "Failed to create calendar event" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[create-booking] Calendar event created:", calendarEvent.id);

    // Create notification for the user
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "New Meeting Booked",
      content: `${name} has booked a meeting for ${formatDateForDisplay(startDate)} at ${time}`,
      source: "calendar",
      action_type: "view_event",
      action_data: { eventId: calendarEvent.id },
    });

    console.log("[create-booking] Notification created for user");

    // Send confirmation email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 24px;">✓</span>
                </div>
                <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">Meeting Confirmed!</h1>
              </div>
              
              <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
                Hi ${name},
              </p>
              
              <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
                Your meeting has been successfully scheduled. Here are the details:
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <div style="margin-bottom: 12px;">
                  <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Date</span>
                  <p style="margin: 4px 0 0; color: #111827; font-weight: 500;">${formatDateForDisplay(startDate)}</p>
                </div>
                <div style="margin-bottom: 12px;">
                  <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Time</span>
                  <p style="margin: 4px 0 0; color: #111827; font-weight: 500;">${time}</p>
                </div>
                <div>
                  <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Duration</span>
                  <p style="margin: 4px 0 0; color: #111827; font-weight: 500;">30 minutes</p>
                </div>
              </div>
              
              <p style="color: #6b7280; margin: 0 0 8px; font-size: 14px; line-height: 1.6;">
                If you need to reschedule or cancel, please reply to this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              
              <p style="color: #9ca3af; margin: 0; font-size: 12px; text-align: center;">
                Powered by Arlo
              </p>
            </div>
          </body>
          </html>
        `;

        const emailResponse = await resend.emails.send({
          from: "Arlo <onboarding@resend.dev>",
          to: [email],
          subject: `Meeting Confirmed - ${formatDateForDisplay(startDate)} at ${time}`,
          html: emailHtml,
        });

        console.log("[create-booking] Confirmation email sent:", emailResponse);
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error("[create-booking] Failed to send confirmation email:", emailError);
      }
    } else {
      console.warn("[create-booking] RESEND_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        event: {
          id: calendarEvent.id,
          title: eventTitle,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
        },
        message: "Meeting booked successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[create-booking] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

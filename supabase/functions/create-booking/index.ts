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

function formatDateForGoogleCalendar(date: Date): string {
  // Format: YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function generateGoogleCalendarUrl(title: string, startDate: Date, endDate: Date, description: string): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDateForGoogleCalendar(startDate)}/${formatDateForGoogleCalendar(endDate)}`,
    details: description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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
        
        // Generate URLs
        const googleCalendarUrl = generateGoogleCalendarUrl(
          `Meeting with ${handle || 'Host'}`,
          startDate,
          endDate,
          `Meeting booked via Arlo Calendar`
        );
        
        // For manage booking, link to the public booking page with the event ID
        const siteUrl = Deno.env.get("SITE_URL") || "https://arlo.jacobtartabini.com";
        const manageBookingUrl = `${siteUrl}/booking/${calendarEvent.id}`;
        
        const emailHtml = `
          <!doctype html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width,initial-scale=1" />
              <meta name="x-apple-disable-message-reformatting" />
              <title>Meeting Confirmed</title>
            </head>
            <body style="margin:0; padding:0; background-color:#f6f7fb;">
              <!-- Preheader (hidden preview text) -->
              <div style="display:none; font-size:1px; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
                Your meeting is confirmed — ${formatDateForDisplay(startDate)} at ${time}.
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f6f7fb;">
                <tr>
                  <td align="center" style="padding:48px 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:560px; max-width:560px;">
                      <tr>
                        <td
                          style="
                            background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.80));
                            border: 1px solid rgba(17,24,39,0.08);
                            border-radius: 18px;
                            box-shadow: 0 18px 40px rgba(17,24,39,0.10);
                            padding: 28px;
                          "
                        >
                          <!-- Header -->
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td align="left" style="padding-bottom:18px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td
                                      width="44"
                                      height="44"
                                      align="center"
                                      valign="middle"
                                      style="
                                        width:44px; height:44px;
                                        border-radius: 14px;
                                        background: linear-gradient(135deg, rgba(16,185,129,1), rgba(5,150,105,1));
                                        box-shadow: 0 10px 22px rgba(16,185,129,0.22);
                                        color:#ffffff;
                                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                                        font-size:22px;
                                        font-weight:700;
                                      "
                                    >
                                      ✓
                                    </td>
                                    <td style="padding-left:14px;">
                                      <div
                                        style="
                                          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                                          color:#111827;
                                          font-size:18px;
                                          font-weight:700;
                                          letter-spacing:-0.2px;
                                        "
                                      >
                                        Meeting confirmed
                                      </div>
                                      <div
                                        style="
                                          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                                          color:#6b7280;
                                          font-size:13px;
                                          margin-top:2px;
                                        "
                                      >
                                        Your schedule is set. Details below.
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <!-- Greeting -->
                            <tr>
                              <td style="padding: 6px 0 18px 0;">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#374151; font-size:14px; line-height:1.6;">
                                  Hi <span style="color:#111827; font-weight:700;">${name}</span>,
                                  <br />
                                  Your meeting has been successfully scheduled.
                                </div>
                              </td>
                            </tr>
                            <!-- Details panel -->
                            <tr>
                              <td
                                style="
                                  padding: 18px;
                                  background: rgba(255,255,255,0.75);
                                  border: 1px solid rgba(17,24,39,0.08);
                                  border-radius: 14px;
                                  box-shadow: 0 10px 26px rgba(17,24,39,0.06);
                                "
                              >
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td style="padding: 0 0 10px 0;">
                                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:11px; letter-spacing:0.12em; text-transform:uppercase;">
                                        Date
                                      </div>
                                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:15px; font-weight:700; margin-top:4px;">
                                        ${formatDateForDisplay(startDate)}
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0;">
                                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:11px; letter-spacing:0.12em; text-transform:uppercase;">
                                        Time
                                      </div>
                                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:15px; font-weight:700; margin-top:4px;">
                                        ${time}
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0 0 0;">
                                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:11px; letter-spacing:0.12em; text-transform:uppercase;">
                                        Duration
                                      </div>
                                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:15px; font-weight:700; margin-top:4px;">
                                        30 minutes
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <!-- Buttons row -->
                            <tr>
                              <td style="padding: 18px 0 6px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <!-- Manage meeting -->
                                    <td
                                      style="
                                        background: rgba(255,255,255,0.90);
                                        border: 1px solid rgba(17,24,39,0.10);
                                        border-radius: 12px;
                                        box-shadow: 0 10px 20px rgba(17,24,39,0.06);
                                      "
                                    >
                                      <a
                                        href="${manageBookingUrl}"
                                        style="
                                          display:inline-block;
                                          padding: 12px 14px;
                                          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                                          font-size:13px;
                                          font-weight:700;
                                          color:#111827;
                                          text-decoration:none;
                                        "
                                      >
                                        View / manage meeting →
                                      </a>
                                    </td>
                                    <td style="width:10px; font-size:0; line-height:0;">&nbsp;</td>
                                    <!-- Add to Google Calendar -->
                                    <td
                                      style="
                                        background: rgba(16,185,129,0.10);
                                        border: 1px solid rgba(16,185,129,0.22);
                                        border-radius: 12px;
                                      "
                                    >
                                      <a
                                        href="${googleCalendarUrl}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style="
                                          display:inline-block;
                                          padding: 12px 14px;
                                          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                                          font-size:13px;
                                          font-weight:800;
                                          color:#065f46;
                                          text-decoration:none;
                                        "
                                      >
                                        Add to Google Calendar
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <!-- Fallback link -->
                            <tr>
                              <td style="padding: 12px 0;">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#9ca3af; font-size:11px; line-height:1.5;">
                                  If the button doesn't work, copy and paste this link into your browser:<br />
                                  <a href="${googleCalendarUrl}" style="color:#6b7280; word-break:break-all;">${googleCalendarUrl}</a>
                                </div>
                              </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                              <td style="padding: 18px 0 0 0;">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:13px; line-height:1.6;">
                                  Need to reschedule or cancel? Just reply to this email.
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 18px 0 0 0; border-top: 1px solid rgba(17,24,39,0.08);">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td>
                                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#9ca3af; font-size:11px;">
                                        Powered by Arlo
                                      </div>
                                    </td>
                                    <td align="right">
                                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#9ca3af; font-size:11px;">
                                        calendar@jacobtartabini.com
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `;

        const emailResponse = await resend.emails.send({
          from: "Arlo Calendar <calendar@jacobtartabini.com>",
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-arlo-authorization, x-client-info, apikey, content-type, x-user-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

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

function formatDateForGoogleCalendar(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
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

function generateReminderEmailHtml(
  guestName: string,
  guestEmail: string,
  startDate: Date,
  manageBookingUrl: string,
  googleCalendarUrl: string,
  isForHost: boolean
): string {
  const time = formatTimeForDisplay(startDate);
  const recipient = isForHost ? "You have" : `Hi ${guestName}, you have`;
  const headerText = isForHost ? "Meeting Reminder" : "Meeting Tomorrow";
  const subheaderText = isForHost ? `Your meeting with ${guestName} is tomorrow.` : "Just a friendly reminder about your upcoming meeting.";
  
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Meeting Reminder</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f6f7fb;">
        <div style="display:none; font-size:1px; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
          ${recipient} a meeting tomorrow at ${time}.
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f6f7fb;">
          <tr>
            <td align="center" style="padding:48px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:560px; max-width:560px;">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.80)); border: 1px solid rgba(17,24,39,0.08); border-radius: 18px; box-shadow: 0 18px 40px rgba(17,24,39,0.10); padding: 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <!-- Header -->
                      <tr>
                        <td align="left" style="padding-bottom:18px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="44" height="44" align="center" valign="middle" style="width:44px; height:44px; border-radius: 14px; background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 10px 22px rgba(245,158,11,0.22); color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:22px; font-weight:700;">
                                ⏰
                              </td>
                              <td style="padding-left:14px;">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:18px; font-weight:700; letter-spacing:-0.2px;">
                                  ${headerText}
                                </div>
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:13px; margin-top:2px;">
                                  ${subheaderText}
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${isForHost ? `
                      <!-- Guest Info -->
                      <tr>
                        <td style="padding: 18px; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15); border-radius: 14px; margin-bottom:16px;">
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:11px; letter-spacing:0.12em; text-transform:uppercase;">Guest</div>
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:16px; font-weight:700; margin-top:4px;">${guestName}</div>
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#3b82f6; font-size:14px; margin-top:2px;">
                            <a href="mailto:${guestEmail}" style="color:#3b82f6; text-decoration:none;">${guestEmail}</a>
                          </div>
                        </td>
                      </tr>
                      ` : ''}
                      <!-- Details panel -->
                      <tr>
                        <td style="padding: 18px; background: rgba(255,255,255,0.75); border: 1px solid rgba(17,24,39,0.08); border-radius: 14px; box-shadow: 0 10px 26px rgba(17,24,39,0.06); ${isForHost ? 'margin-top:16px;' : ''}">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 0 0 10px 0;">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:11px; letter-spacing:0.12em; text-transform:uppercase;">Date</div>
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:15px; font-weight:700; margin-top:4px;">${formatDateForDisplay(startDate)}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0;">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:11px; letter-spacing:0.12em; text-transform:uppercase;">Time</div>
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:15px; font-weight:700; margin-top:4px;">${time}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0 0 0;">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:11px; letter-spacing:0.12em; text-transform:uppercase;">Duration</div>
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:15px; font-weight:700; margin-top:4px;">30 minutes</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Buttons -->
                      <tr>
                        <td style="padding: 18px 0 6px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:10px;">
                                <a href="${googleCalendarUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding: 12px 20px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 10px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; color:#ffffff; text-decoration:none; box-shadow: 0 8px 16px rgba(245,158,11,0.20);">
                                  View in Calendar
                                </a>
                              </td>
                              ${!isForHost ? `
                              <td>
                                <a href="${manageBookingUrl}" style="display:inline-block; padding: 12px 20px; background: #ffffff; border: 1px solid rgba(17,24,39,0.15); border-radius: 10px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#111827; text-decoration:none;">
                                  Manage Meeting
                                </a>
                              </td>
                              ` : ''}
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 18px 0 0 0; border-top: 1px solid rgba(17,24,39,0.08);">
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#9ca3af; font-size:11px;">Powered by Arlo</div>
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[send-reminder] Starting reminder check...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[send-reminder] Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!resendApiKey) {
      console.error("[send-reminder] Missing RESEND_API_KEY");
      return new Response(
        JSON.stringify({ error: "Email configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Find meetings that are between 23 and 25 hours from now (to handle hourly cron with some buffer)
    const now = new Date();
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log("[send-reminder] Looking for meetings between:", {
      from: in23Hours.toISOString(),
      to: in25Hours.toISOString(),
    });

    // Get calendar events with "meeting" category that are coming up in ~24 hours
    const { data: upcomingMeetings, error: fetchError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("category", "meeting")
      .gte("start_time", in23Hours.toISOString())
      .lte("start_time", in25Hours.toISOString());

    if (fetchError) {
      console.error("[send-reminder] Error fetching meetings:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch meetings" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[send-reminder] Found meetings:", upcomingMeetings?.length || 0);

    if (!upcomingMeetings || upcomingMeetings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No upcoming meetings to remind" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const HOST_EMAIL = "jacobtart8@gmail.com";
    let remindersSent = 0;

    for (const meeting of upcomingMeetings) {
      try {
        // Parse guest info from description
        // Format: "Booked by: Name (email@example.com)"
        const descMatch = meeting.description?.match(/Booked by: (.+?) \((.+?)\)/);
        
        if (!descMatch) {
          console.log("[send-reminder] Skipping meeting without guest info:", meeting.id);
          continue;
        }

        const guestName = descMatch[1];
        const guestEmail = descMatch[2];
        const startDate = new Date(meeting.start_time);
        const endDate = new Date(meeting.end_time);
        
        const manageBookingUrl = `https://meet.jacobtartabini.com/booking/${meeting.id}`;
        
        // Generate calendar URL for guest
        const guestCalendarUrl = generateGoogleCalendarUrl(
          meeting.title,
          startDate,
          endDate,
          `Meeting reminder`
        );
        
        // Generate calendar URL for host
        const hostCalendarUrl = generateGoogleCalendarUrl(
          `Meeting with ${guestName}`,
          startDate,
          endDate,
          `Guest: ${guestName} (${guestEmail})`
        );

        // Send reminder to guest
        const guestEmailHtml = generateReminderEmailHtml(
          guestName, guestEmail, startDate, manageBookingUrl, guestCalendarUrl, false
        );

        await resend.emails.send({
          from: "Arlo Calendar <calendar@jacobtartabini.com>",
          to: [guestEmail],
          subject: `Reminder: Meeting Tomorrow at ${formatTimeForDisplay(startDate)}`,
          html: guestEmailHtml,
        });

        console.log("[send-reminder] Guest reminder sent to:", guestEmail);

        // Send reminder to host
        const hostEmailHtml = generateReminderEmailHtml(
          guestName, guestEmail, startDate, manageBookingUrl, hostCalendarUrl, true
        );

        await resend.emails.send({
          from: "Arlo Calendar <calendar@jacobtartabini.com>",
          to: [HOST_EMAIL],
          subject: `Reminder: Meeting with ${guestName} Tomorrow at ${formatTimeForDisplay(startDate)}`,
          html: hostEmailHtml,
        });

        console.log("[send-reminder] Host reminder sent for meeting:", meeting.id);
        remindersSent++;
        
      } catch (emailError) {
        console.error("[send-reminder] Failed to send reminder for meeting:", meeting.id, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${remindersSent} reminder(s)`,
        meetingsProcessed: upcomingMeetings.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-reminder] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);

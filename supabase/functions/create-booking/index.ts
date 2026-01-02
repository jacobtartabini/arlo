import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";
import { 
  validateBookingInput, 
  validationErrorResponse,
  type BookingInput 
} from '../_shared/validation.ts';
import { 
  checkRateLimit, 
  getClientIP, 
  rateLimitResponse, 
  isHoneypotTriggered,
  isSuspiciousRequest,
  generateSecureToken,
  hashForLogging,
  RATE_LIMITS 
} from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Host email for notifications
const HOST_EMAIL = "jacobtart8@gmail.com";

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

function generateOutlookCalendarUrl(title: string, startDate: Date, endDate: Date, description: string): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: description,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function generateICSContent(title: string, startDate: Date, endDate: Date, description: string, eventId: string): string {
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Arlo Calendar//EN
BEGIN:VEVENT
UID:${eventId}@arlo.jacobtartabini.com
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
END:VEVENT
END:VCALENDAR`;
}

function createDateInTimezone(dateStr: string, hours: number, minutes: number, timezone: string): Date {
  const datePart = dateStr.split('T')[0];
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  
  const offsetMap: Record<string, number> = {
    'America/New_York': -5,
    'America/Chicago': -6,
    'America/Denver': -7,
    'America/Los_Angeles': -8,
    'UTC': 0,
  };
  
  const offset = offsetMap[timezone] ?? -5;
  const localDate = new Date(`${datePart}T${timeStr}`);
  const utcDate = new Date(localDate.getTime() - (offset * 60 * 60 * 1000));
  
  return utcDate;
}

function generateGuestEmailHtml(
  name: string,
  time: string,
  startDate: Date,
  manageBookingUrl: string,
  googleCalendarUrl: string,
  outlookCalendarUrl: string,
  icsDataUri: string
): string {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>Meeting Confirmed</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f6f7fb;">
        <div style="display:none; font-size:1px; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
          Your meeting is confirmed — ${formatDateForDisplay(startDate)} at ${time}.
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
                              <td width="44" height="44" align="center" valign="middle" style="width:44px; height:44px; border-radius: 14px; background: linear-gradient(135deg, rgba(16,185,129,1), rgba(5,150,105,1)); box-shadow: 0 10px 22px rgba(16,185,129,0.22); color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:22px; font-weight:700;">
                                ✓
                              </td>
                              <td style="padding-left:14px;">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:18px; font-weight:700; letter-spacing:-0.2px;">
                                  Meeting confirmed
                                </div>
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:13px; margin-top:2px;">
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
                        <td style="padding: 18px; background: rgba(255,255,255,0.75); border: 1px solid rgba(17,24,39,0.08); border-radius: 14px; box-shadow: 0 10px 26px rgba(17,24,39,0.06);">
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
                      <!-- Add to Calendar Section -->
                      <tr>
                        <td style="padding: 18px 0 6px 0;">
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:12px;">Add to Calendar</div>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <!-- Google Calendar -->
                            <tr>
                              <td style="padding-bottom:8px;">
                                <a href="${googleCalendarUrl}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; padding: 12px 16px; background: #ffffff; border: 1px solid rgba(17,24,39,0.10); border-radius: 12px; text-decoration:none; box-shadow: 0 2px 8px rgba(17,24,39,0.04);">
                                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" width="24" height="24" style="width:24px; height:24px; margin-right:12px;" />
                                  <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; color:#111827;">Google Calendar</span>
                                </a>
                              </td>
                            </tr>
                            <!-- Outlook Calendar -->
                            <tr>
                              <td style="padding-bottom:8px;">
                                <a href="${outlookCalendarUrl}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; padding: 12px 16px; background: #ffffff; border: 1px solid rgba(17,24,39,0.10); border-radius: 12px; text-decoration:none; box-shadow: 0 2px 8px rgba(17,24,39,0.04);">
                                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" alt="Outlook" width="24" height="24" style="width:24px; height:24px; margin-right:12px;" />
                                  <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; color:#111827;">Outlook Calendar</span>
                                </a>
                              </td>
                            </tr>
                            <!-- Apple Calendar -->
                            <tr>
                              <td>
                                <a href="${icsDataUri}" download="meeting.ics" style="display:flex; align-items:center; padding: 12px 16px; background: #ffffff; border: 1px solid rgba(17,24,39,0.10); border-radius: 12px; text-decoration:none; box-shadow: 0 2px 8px rgba(17,24,39,0.04);">
                                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/ICloud_logo.svg" alt="Apple Calendar" width="24" height="24" style="width:24px; height:24px; margin-right:12px;" />
                                  <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; color:#111827;">Apple Calendar (.ics)</span>
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Manage Meeting Button -->
                      <tr>
                        <td style="padding: 18px 0 6px 0;">
                          <a href="${manageBookingUrl}" style="display:inline-block; padding: 14px 24px; background: linear-gradient(135deg, #111827, #1f2937); border-radius: 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; box-shadow: 0 10px 20px rgba(17,24,39,0.15);">
                            View / Manage Meeting →
                          </a>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 18px 0 0 0;">
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:13px; line-height:1.6;">
                            Need to reschedule or cancel? Use the manage meeting link above.
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 18px 0 0 0; border-top: 1px solid rgba(17,24,39,0.08);">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td>
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#9ca3af; font-size:11px;">Powered by Arlo</div>
                              </td>
                              <td align="right">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#9ca3af; font-size:11px;">calendar@jacobtartabini.com</div>
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
}

function generateHostEmailHtml(
  guestName: string,
  guestEmail: string,
  time: string,
  startDate: Date,
  message: string | undefined,
  googleCalendarUrl: string
): string {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>New Meeting Booked</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f6f7fb;">
        <div style="display:none; font-size:1px; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
          ${guestName} has booked a meeting with you on ${formatDateForDisplay(startDate)}.
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
                              <td width="44" height="44" align="center" valign="middle" style="width:44px; height:44px; border-radius: 14px; background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 10px 22px rgba(59,130,246,0.22); color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:22px; font-weight:700;">
                                📅
                              </td>
                              <td style="padding-left:14px;">
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827; font-size:18px; font-weight:700; letter-spacing:-0.2px;">
                                  New Meeting Booked
                                </div>
                                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:13px; margin-top:2px;">
                                  Someone has scheduled time with you.
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
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
                      <!-- Details panel -->
                      <tr>
                        <td style="padding: 18px; background: rgba(255,255,255,0.75); border: 1px solid rgba(17,24,39,0.08); border-radius: 14px; box-shadow: 0 10px 26px rgba(17,24,39,0.06); margin-top:16px;">
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
                      ${message ? `
                      <!-- Message -->
                      <tr>
                        <td style="padding: 18px 0 0 0;">
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#6b7280; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:8px;">Message from Guest</div>
                          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#374151; font-size:14px; line-height:1.6; padding:14px; background:#f9fafb; border-radius:10px; border:1px solid rgba(17,24,39,0.06);">
                            ${message}
                          </div>
                        </td>
                      </tr>
                      ` : ''}
                      <!-- Add to Calendar -->
                      <tr>
                        <td style="padding: 18px 0 6px 0;">
                          <a href="${googleCalendarUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding: 14px 24px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; box-shadow: 0 10px 20px rgba(59,130,246,0.25);">
                            Add to Calendar →
                          </a>
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

  // Rate limiting by IP
  const clientIP = getClientIP(req);
  const ipRateCheck = checkRateLimit(clientIP, RATE_LIMITS.createBooking);
  
  if (!ipRateCheck.allowed) {
    console.log(`[create-booking] Rate limited IP: ${hashForLogging(clientIP)}`);
    return rateLimitResponse(ipRateCheck, corsHeaders);
  }

  try {
    const rawInput = await req.json();
    
    // Bot detection: check honeypot fields
    if (isHoneypotTriggered(rawInput as Record<string, unknown>)) {
      console.log('[create-booking] Honeypot triggered - silently rejecting');
      // Return fake success to not tip off bots
      return new Response(
        JSON.stringify({ success: true, message: 'Booking confirmed' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Bot detection: check suspicious patterns
    if (isSuspiciousRequest(req, rawInput as Record<string, unknown>)) {
      console.log('[create-booking] Suspicious request pattern detected');
      return new Response(
        JSON.stringify({ error: 'Request could not be processed. Please try again.' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate all input using the shared validation module
    const validation = validateBookingInput(rawInput);
    if (!validation.success) {
      console.error("[create-booking] Validation failed:", validation.error, validation.errors);
      return validationErrorResponse(validation.error!, validation.errors, corsHeaders);
    }

    const { date, time, name, email, message, handle, timezone } = validation.data!;
    
    // Additional rate limiting by email
    const emailRateCheck = checkRateLimit(email, RATE_LIMITS.bookingPerEmail);
    if (!emailRateCheck.allowed) {
      console.log(`[create-booking] Rate limited email: ${hashForLogging(email)}`);
      return new Response(
        JSON.stringify({ 
          error: 'You have reached the maximum number of bookings for today. Please try again tomorrow.',
          code: 'BOOKING_LIMIT_EXCEEDED'
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[create-booking] Validated booking request:", { date, time, name, email: hashForLogging(email), handle, timezone });

    const { hours, minutes } = parseTimeToHours(time);
    const clientTimezone = timezone || 'America/New_York';
    const startDate = createDateInTimezone(date, hours, minutes, clientTimezone);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    console.log("[create-booking] Parsed times:", { 
      inputDate: date, 
      inputTime: time, 
      timezone: clientTimezone,
      startDateUTC: startDate.toISOString(), 
      endDateUTC: endDate.toISOString() 
    });

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

    const { data: users, error: userError } = await supabase
      .from("user_settings")
      .select("user_key")
      .not("user_key", "is", null)
      .limit(1);

    if (userError) {
      console.error("[create-booking] Error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to find booking recipient" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use TEXT user_key instead of UUID user_id
    const userKey = users?.[0]?.user_key;
    
    if (!userKey) {
      console.error("[create-booking] No user found for booking");
      return new Response(
        JSON.stringify({ error: "No user available for booking" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const eventTitle = `Meeting with ${name}`;
    const eventDescription = message 
      ? `Booked by: ${name} (${email})\n\nMessage: ${message}`
      : `Booked by: ${name} (${email})`;

    const { data: calendarEvent, error: eventError } = await supabase
      .from("calendar_events")
      .insert({
        user_key: userKey, // Use TEXT user_key instead of UUID user_id
        title: eventTitle,
        description: eventDescription,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        category: "meeting",
        color: "#3b82f6",
        is_all_day: false,
        source: "arlo", // Mark as Arlo-created
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

    // Push to Google Calendar if user has integration
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        // Check if user has Google Calendar integration
        const { data: googleIntegration } = await supabase
          .from("calendar_integrations")
          .select("id")
          .eq("user_key", userKey) // Use TEXT user_key
          .eq("provider", "google")
          .eq("enabled", true)
          .single();

        if (googleIntegration) {
          // Call calendar-sync to push the event to Google
          const syncResponse = await fetch(`${SUPABASE_URL}/functions/v1/calendar-sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              action: "push_event",
              event: {
                id: calendarEvent.id,
                user_key: userKey, // Use TEXT user_key
                title: eventTitle,
                description: eventDescription,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                is_all_day: false,
              },
              eventAction: "create",
            }),
          });

          const syncResult = await syncResponse.json();
          if (syncResult.success) {
            console.log("[create-booking] Event pushed to Google Calendar");
          } else {
            console.warn("[create-booking] Failed to push to Google:", syncResult.error);
          }
        }
      }
    } catch (syncError) {
      console.error("[create-booking] Error pushing to Google Calendar:", syncError);
      // Don't fail the booking if Google sync fails
    }

    await supabase.from("notifications").insert({
      user_key: userKey, // Use TEXT user_key
      title: "New Meeting Booked",
      content: `${name} has booked a meeting for ${formatDateForDisplay(startDate)} at ${time}`,
      source: "calendar",
      action_type: "view_event",
      action_data: { eventId: calendarEvent.id },
    });

    console.log("[create-booking] Notification created for user");

    // Send emails
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        // Generate calendar URLs
        const meetingTitle = `Meeting with ${handle || 'Host'}`;
        const meetingDescription = `Meeting booked via Arlo Calendar`;
        
        const googleCalendarUrl = generateGoogleCalendarUrl(meetingTitle, startDate, endDate, meetingDescription);
        const outlookCalendarUrl = generateOutlookCalendarUrl(meetingTitle, startDate, endDate, meetingDescription);
        
        // Generate ICS content and create data URI
        const icsContent = generateICSContent(meetingTitle, startDate, endDate, meetingDescription, calendarEvent.id);
        const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
        
        const manageBookingUrl = `https://meet.jacobtartabini.com/booking/${calendarEvent.id}`;
        
        // Send guest confirmation email
        const guestEmailHtml = generateGuestEmailHtml(
          name, time, startDate, manageBookingUrl,
          googleCalendarUrl, outlookCalendarUrl, icsDataUri
        );
        
        const guestEmailResponse = await resend.emails.send({
          from: "Arlo Calendar <calendar@jacobtartabini.com>",
          to: [email],
          subject: `Meeting Confirmed - ${formatDateForDisplay(startDate)} at ${time}`,
          html: guestEmailHtml,
        });

        console.log("[create-booking] Guest confirmation email sent:", guestEmailResponse);
        
        // Send host notification email
        const hostGoogleCalendarUrl = generateGoogleCalendarUrl(
          `Meeting with ${name}`,
          startDate,
          endDate,
          `Guest: ${name} (${email})${message ? `\n\nMessage: ${message}` : ''}`
        );
        
        const hostEmailHtml = generateHostEmailHtml(
          name, email, time, startDate, message, hostGoogleCalendarUrl
        );
        
        const hostEmailResponse = await resend.emails.send({
          from: "Arlo Calendar <calendar@jacobtartabini.com>",
          to: [HOST_EMAIL],
          subject: `New Meeting: ${name} - ${formatDateForDisplay(startDate)} at ${time}`,
          html: hostEmailHtml,
        });

        console.log("[create-booking] Host notification email sent:", hostEmailResponse);
        
      } catch (emailError) {
        console.error("[create-booking] Failed to send emails:", emailError);
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

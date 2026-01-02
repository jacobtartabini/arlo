import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  getCorsHeaders,
  validateOrigin,
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse 
} from '../_shared/arloAuth.ts'
import { encrypt, decrypt, isEncrypted } from '../_shared/encryption.ts'
import { 
  createOAuthNonce, 
  validateAndConsumeNonce, 
  encodeOAuthState, 
  decodeOAuthState,
  cleanupExpiredNonces
} from '../_shared/oauthNonce.ts'
import { 
  checkAuthRateLimit, 
  AUTH_RATE_LIMITS, 
  logOAuthEvent,
  logAuthFailure
} from '../_shared/authRateLimit.ts'

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Determine the redirect URI based on environment
function getRedirectUri(): string {
  return "https://arlo.jacobtartabini.com/login";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  // Validate origin for non-preflight requests
  const originError = validateOrigin(req);
  if (originError) return originError;

  try {
    const body = await req.json();
    const { action, code, state, calendars, integrationId } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Periodically clean up expired nonces
    await cleanupExpiredNonces();

    // Step 2: Exchange code for tokens - SECURED WITH NONCE VALIDATION
    // This is called from the OAuth callback and now requires JWT + valid nonce
    if (action === "exchange_code") {
      // Rate limit code exchange attempts
      const rateLimitResponse = checkAuthRateLimit(req, AUTH_RATE_LIMITS.oauthExchange);
      if (rateLimitResponse) return rateLimitResponse;

      if (!code || !state) {
        logOAuthEvent('state_invalid', req, { reason: 'missing code or state' });
        return errorResponse(req, "Missing code or state", 400);
      }

      // Verify JWT authentication for code exchange
      const authResult = await verifyArloJWT(req);
      
      if (!authResult.authenticated) {
        logAuthFailure(req, 'OAuth exchange without valid JWT');
        return unauthorizedResponse(req, authResult.error || 'Authentication required');
      }

      // userKey is the TEXT identifier from JWT.sub (email/tailnet identifier)
      const userKey = authResult.userId;

      // Decode and validate the nonce from state
      const { nonce, provider } = decodeOAuthState(state);
      
      if (!nonce || provider !== 'google') {
        logOAuthEvent('state_invalid', req, { reason: 'invalid state format' });
        return errorResponse(req, "Invalid OAuth state", 400);
      }

      // Validate and consume the nonce (single-use)
      const nonceResult = await validateAndConsumeNonce(nonce, 'google');
      
      if (!nonceResult.valid) {
        logOAuthEvent('nonce_invalid', req, { error: nonceResult.error });
        return errorResponse(req, nonceResult.error || "Invalid or expired OAuth session", 400);
      }

      // CRITICAL: Verify the JWT user matches the nonce user
      if (nonceResult.userId !== userKey) {
        logOAuthEvent('nonce_invalid', req, { 
          reason: 'user mismatch', 
          nonceUser: nonceResult.userId?.substring(0, 10),
          jwtUser: userKey?.substring(0, 10)
        });
        return errorResponse(req, "OAuth session mismatch", 400);
      }

      const redirectUri = getRedirectUri();

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        logOAuthEvent('code_exchange_failed', req, { error: tokenData.error });
        console.error("[google-calendar-auth] Token exchange error:", tokenData);
        return errorResponse(req, tokenData.error_description || tokenData.error, 400);
      }

      const { access_token, refresh_token, expires_in } = tokenData;
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      // Encrypt tokens before storing
      const encryptedAccessToken = await encrypt(access_token);
      const encryptedRefreshToken = await encrypt(refresh_token);

      // Store encrypted tokens - using user_key (TEXT) for the identifier
      const { error: upsertError } = await supabase
        .from("calendar_integrations")
        .upsert({
          user_key: userKey, // TEXT identifier from JWT.sub
          provider: "google",
          enabled: true,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: expiresAt,
          last_sync_status: "pending",
        }, {
          onConflict: "user_key,provider",
        });

      if (upsertError) {
        console.error("[google-calendar-auth] Database error:", upsertError);
        return errorResponse(req, "Failed to save tokens", 500);
      }

      console.log("[google-calendar-auth] Successfully connected Google Calendar for user_key:", userKey);
      return jsonResponse(req, { success: true });
    }

    // All other actions require JWT authentication
    const authResult = await verifyArloJWT(req);
    
    if (!authResult.authenticated) {
      logAuthFailure(req, `OAuth action ${action} without valid JWT`);
      console.log('[google-calendar-auth] Authentication failed:', authResult.error);
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    // userKey is derived from JWT.sub - TEXT identifier (email/tailnet)
    const userKey = authResult.userId;
    console.log('[google-calendar-auth] Authenticated user_key (from JWT.sub):', userKey);

    // Step 1: Generate OAuth URL with secure nonce
    if (action === "get_auth_url") {
      // Rate limit auth URL requests
      const rateLimitResponse = checkAuthRateLimit(req, AUTH_RATE_LIMITS.oauthAuthUrl);
      if (rateLimitResponse) return rateLimitResponse;

      const redirectUri = getRedirectUri();
      const scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
      ].join(" ");

      // Create a secure nonce bound to this user
      const nonce = await createOAuthNonce(userKey, 'google');
      
      // Encode state with nonce (not user ID)
      const encodedState = encodeOAuthState(nonce, 'google');

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", encodedState);

      console.log("[google-calendar-auth] Generated auth URL with nonce for user_key:", userKey);
      return jsonResponse(req, { url: authUrl.toString() });
    }

    // Step 3: Fetch calendar list
    if (action === "list_calendars") {
      // Get integration using user_key (TEXT column)
      const { data: integration, error: fetchError } = await supabase
        .from("calendar_integrations")
        .select("*")
        .eq("user_key", userKey)
        .eq("provider", "google")
        .single();

      if (fetchError || !integration) {
        console.log("[google-calendar-auth] No integration found for user_key:", userKey, "Error:", fetchError);
        return errorResponse(req, "Google Calendar not connected", 400);
      }

      // Decrypt and refresh token if needed
      let accessToken = await decrypt(integration.access_token);
      const decryptedRefreshToken = await decrypt(integration.refresh_token);
      
      const expiresAt = new Date(integration.token_expires_at);
      if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: decryptedRefreshToken,
            grant_type: "refresh_token",
          }),
        });
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          // Encrypt the new access token before storing
          const encryptedAccessToken = await encrypt(accessToken);
          await supabase
            .from("calendar_integrations")
            .update({
              access_token: encryptedAccessToken,
              token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            })
            .eq("id", integration.id);
        } else {
          logOAuthEvent('token_refresh_failed', req, { error: tokenData.error });
        }
      }

      // Fetch calendar list from Google
      const calendarListResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!calendarListResponse.ok) {
        const errorText = await calendarListResponse.text();
        console.error("[google-calendar-auth] Failed to fetch calendars:", errorText);
        return errorResponse(req, "Failed to fetch calendars", 500);
      }

      const calendarListData = await calendarListResponse.json();
      const calendarsList = (calendarListData.items || []).map((cal: any) => ({
        id: cal.id,
        name: cal.summary || cal.id,
        color: cal.backgroundColor || "#4285f4",
        primary: cal.primary || false,
        accessRole: cal.accessRole,
      }));

      console.log("[google-calendar-auth] Fetched", calendarsList.length, "calendars for user_key:", userKey);
      return jsonResponse(req, { calendars: calendarsList, integrationId: integration.id });
    }

    // Step 4: Save selected calendars
    if (action === "save_calendars") {
      if (!integrationId || !calendars) {
        return errorResponse(req, "Missing required fields", 400);
      }

      // Verify the integration belongs to this user using user_key
      const { data: integration } = await supabase
        .from("calendar_integrations")
        .select("id")
        .eq("id", integrationId)
        .eq("user_key", userKey)
        .single();

      if (!integration) {
        return errorResponse(req, "Integration not found or access denied", 403);
      }

      // Delete existing selections for this integration
      await supabase
        .from("google_calendar_selections")
        .delete()
        .eq("integration_id", integrationId);

      // Insert new selections
      const selections = calendars.map((cal: any) => ({
        integration_id: integrationId,
        calendar_id: cal.id,
        calendar_name: cal.name,
        calendar_color: cal.color,
        enabled: cal.enabled,
      }));

      if (selections.length > 0) {
        const { error: insertError } = await supabase
          .from("google_calendar_selections")
          .insert(selections);

        if (insertError) {
          console.error("[google-calendar-auth] Failed to save calendars:", insertError);
          return errorResponse(req, "Failed to save calendars", 500);
        }
      }

      // Clear sync cursors to force fresh sync
      await supabase
        .from("calendar_integrations")
        .update({ sync_cursor: null })
        .eq("id", integrationId);

      console.log("[google-calendar-auth] Saved", selections.length, "calendar selections");
      return jsonResponse(req, { success: true });
    }

    // Step 5: Disconnect Google Calendar
    if (action === "disconnect") {
      // Delete integration record using user_key (cascade will delete calendar selections)
      await supabase
        .from("calendar_integrations")
        .delete()
        .eq("user_key", userKey)
        .eq("provider", "google");

      // Delete synced Google events using user_key
      await supabase
        .from("calendar_events")
        .delete()
        .eq("user_key", userKey)
        .eq("source", "google");

      console.log("[google-calendar-auth] Disconnected Google Calendar for user_key:", userKey);
      return jsonResponse(req, { success: true });
    }

    return errorResponse(req, "Invalid action", 400);
  } catch (error) {
    console.error("[google-calendar-auth] Error:", error);
    return errorResponse(req, error instanceof Error ? error.message : "Unknown error", 500);
  }
});

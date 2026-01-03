import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { encrypt } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type InboxProvider = 'gmail' | 'outlook' | 'teams';

interface StatePayload {
  userKey: string;
  provider: InboxProvider;
  timestamp: number;
}

// OAuth token endpoints
const TOKEN_ENDPOINTS: Record<string, string> = {
  gmail: 'https://oauth2.googleapis.com/token',
  outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  teams: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

// User info endpoints
const USER_INFO_ENDPOINTS: Record<string, string> = {
  gmail: 'https://www.googleapis.com/oauth2/v2/userinfo',
  outlook: 'https://graph.microsoft.com/v1.0/me',
  teams: 'https://graph.microsoft.com/v1.0/me',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('[inbox-oauth-callback] OAuth error:', error);
      return new Response(
        `<html><body><h1>Connection Failed</h1><p>${error}</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new Response(
        '<html><body><h1>Invalid Request</h1><script>window.close();</script></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Decode state
    let statePayload: StatePayload;
    try {
      statePayload = JSON.parse(atob(state));
    } catch {
      return new Response(
        '<html><body><h1>Invalid State</h1><script>window.close();</script></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const { userKey, provider } = statePayload;

    // Verify state is not too old (15 minutes)
    if (Date.now() - statePayload.timestamp > 15 * 60 * 1000) {
      return new Response(
        '<html><body><h1>Request Expired</h1><p>Please try connecting again.</p><script>window.close();</script></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log(`[inbox-oauth-callback] Processing callback for ${provider}, user: ${userKey}`);

    // Get client credentials
    const clientIdEnv = provider === 'gmail' ? 'GOOGLE_CLIENT_ID' : 'MICROSOFT_CLIENT_ID';
    const clientSecretEnv = provider === 'gmail' ? 'GOOGLE_CLIENT_SECRET' : 'MICROSOFT_CLIENT_SECRET';
    
    const clientId = Deno.env.get(clientIdEnv);
    const clientSecret = Deno.env.get(clientSecretEnv);
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/inbox-oauth-callback`;

    if (!clientId || !clientSecret) {
      console.error(`[inbox-oauth-callback] Missing credentials for ${provider}`);
      return new Response(
        '<html><body><h1>Configuration Error</h1><script>window.close();</script></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Exchange code for tokens
    const tokenEndpoint = TOKEN_ENDPOINTS[provider];
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[inbox-oauth-callback] Token exchange failed:`, errorText);
      return new Response(
        `<html><body><h1>Authentication Failed</h1><p>Could not exchange authorization code.</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    console.log(`[inbox-oauth-callback] Got tokens for ${provider}`);

    // Get user info
    const userInfoEndpoint = USER_INFO_ENDPOINTS[provider];
    const userInfoResponse = await fetch(userInfoEndpoint, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let userEmail = '';
    let userName = '';

    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      
      if (provider === 'gmail') {
        userEmail = userInfo.email || '';
        userName = userInfo.name || userInfo.email || 'Gmail Account';
      } else {
        userEmail = userInfo.mail || userInfo.userPrincipalName || '';
        userName = userInfo.displayName || userInfo.mail || 'Microsoft Account';
      }
    }

    console.log(`[inbox-oauth-callback] User info: ${userName} (${userEmail})`);

    // Encrypt tokens
    const encryptedAccessToken = await encrypt(access_token);
    const encryptedRefreshToken = refresh_token ? await encrypt(refresh_token) : null;

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    // Parse scopes
    const scopeArray = scope ? scope.split(' ') : [];

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert account (update if exists, insert if new)
    const { data, error: dbError } = await supabase
      .from('inbox_accounts')
      .upsert({
        user_key: userKey,
        provider,
        account_email: userEmail,
        account_name: userName,
        account_id: userEmail || `${provider}-${Date.now()}`,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        scopes: scopeArray,
        enabled: true,
      }, {
        onConflict: 'user_key,provider,account_id',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[inbox-oauth-callback] Database error:', dbError);
      return new Response(
        `<html><body><h1>Database Error</h1><p>${dbError.message}</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log(`[inbox-oauth-callback] Account saved: ${data.id}`);

    // Return success page that closes itself
    return new Response(
      `<html>
        <head>
          <style>
            body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f0f0; }
            .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            h1 { color: #22c55e; margin-bottom: 0.5rem; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Connected!</h1>
            <p>${userName} has been connected successfully.</p>
            <p>This window will close automatically...</p>
          </div>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: 'inbox-connected', provider: '${provider}' }, '*');
              }
              window.close();
            }, 2000);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (err) {
    console.error('[inbox-oauth-callback] Error:', err);
    return new Response(
      `<html><body><h1>Error</h1><p>${err instanceof Error ? err.message : 'Unknown error'}</p><script>window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});

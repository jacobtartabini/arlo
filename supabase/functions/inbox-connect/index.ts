import { 
  verifyArloJWT, 
  handleCorsOptions, 
  validateOrigin,
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse,
  getAllowedRedirectUri,
} from '../_shared/arloAuth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encrypt } from '../_shared/encryption.ts';
import { 
  createOAuthNonce, 
  validateAndConsumeNonce,
  encodeOAuthState,
  decodeOAuthState,
  cleanupExpiredNonces
} from '../_shared/oauthNonce.ts';

type InboxProvider = 'gmail' | 'outlook' | 'teams' | 'whatsapp' | 'telegram' | 'instagram' | 'linkedin';

interface ConnectRequest {
  action?: 'get_auth_url' | 'exchange_code';
  provider?: InboxProvider;
  code?: string;
  state?: string;
}

// OAuth configuration per provider
const OAUTH_CONFIG: Record<string, {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
}> = {
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    clientIdEnv: 'GMAIL_CLIENT_ID',
    clientSecretEnv: 'GMAIL_CLIENT_SECRET',
  },
  outlook: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'Mail.Read',
      'Mail.Send',
      'Mail.ReadWrite',
    ],
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
  },
  teams: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'Chat.Read',
      'Chat.ReadWrite',
      'ChatMessage.Send',
    ],
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
  },
};

// Redirect URI is now derived dynamically from the request origin via getAllowedRedirectUri(req).
// All providers share the canonical /auth/oauth-callback route.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  // Validate origin for non-preflight requests
  const originError = validateOrigin(req);
  if (originError) return originError;

  try {
    // All actions require JWT authentication (same as google-calendar-auth)
    const authResult = await verifyArloJWT(req);
    
    if (!authResult.authenticated) {
      const errorMessage = authResult.error || 'Authentication required';
      console.error(`[inbox-connect] Auth failed: ${errorMessage}`);
      return unauthorizedResponse(req, errorMessage);
    }
    
    if (!authResult.userId) {
      console.error('[inbox-connect] Auth succeeded but no userId in JWT sub claim');
      return unauthorizedResponse(req, 'Invalid token: missing user identity');
    }

    const userKey = authResult.userId;
    const body: ConnectRequest = await req.json();
    const { action, provider, code, state } = body;

    const supabase = getSupabaseClient();

    // Periodically clean up expired nonces
    await cleanupExpiredNonces();

    // Handle exchange_code action (Step 2 of OAuth flow)
    if (action === 'exchange_code') {
      if (!code || !state) {
        return errorResponse(req, 'Missing code or state', 400);
      }

      // Decode and validate the nonce from state
      const decoded = decodeOAuthState(state);
      const { nonce, provider: stateProvider } = decoded;
      
      if (!nonce || !stateProvider) {
        console.error('[inbox-connect] Invalid state format');
        return errorResponse(req, 'Invalid OAuth state', 400);
      }

      // Validate and consume the nonce (single-use)
      const nonceResult = await validateAndConsumeNonce(nonce, `inbox_${stateProvider}`);
      
      if (!nonceResult.valid) {
        console.error('[inbox-connect] Nonce validation failed:', nonceResult.error);
        return errorResponse(req, nonceResult.error || 'Invalid or expired OAuth session', 400);
      }

      // CRITICAL: Verify the JWT user matches the nonce user
      if (nonceResult.userId !== userKey) {
        console.error('[inbox-connect] User mismatch - nonce user:', nonceResult.userId, 'JWT user:', userKey);
        return errorResponse(req, 'OAuth session mismatch', 400);
      }

      const oauthConfig = OAUTH_CONFIG[stateProvider];
      if (!oauthConfig) {
        return errorResponse(req, `Unknown provider: ${stateProvider}`, 400);
      }

      const clientId = Deno.env.get(oauthConfig.clientIdEnv);
      const clientSecret = Deno.env.get(oauthConfig.clientSecretEnv);

      if (!clientId || !clientSecret) {
        console.error(`[inbox-connect] Missing credentials for ${stateProvider}`);
        return errorResponse(req, `${stateProvider} OAuth is not configured`, 503);
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(oauthConfig.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`[inbox-connect] Token exchange failed:`, errorText);
        return errorResponse(req, 'Could not exchange authorization code', 400);
      }

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error('[inbox-connect] Token error:', tokens);
        return errorResponse(req, tokens.error_description || tokens.error, 400);
      }

      const { access_token, refresh_token, expires_in, scope } = tokens;

      console.log(`[inbox-connect] Got tokens for ${stateProvider}`);

      // Get user info
      const userInfoResponse = await fetch(oauthConfig.userInfoUrl, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      let userEmail = '';
      let userName = '';

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        
        if (stateProvider === 'gmail') {
          userEmail = userInfo.email || '';
          userName = userInfo.name || userInfo.email || 'Gmail Account';
        } else {
          userEmail = userInfo.mail || userInfo.userPrincipalName || '';
          userName = userInfo.displayName || userInfo.mail || 'Microsoft Account';
        }
      }

      console.log(`[inbox-connect] User info: ${userName} (${userEmail})`);

      // Encrypt tokens
      const encryptedAccessToken = await encrypt(access_token);
      const encryptedRefreshToken = refresh_token ? await encrypt(refresh_token) : null;

      // Calculate token expiration
      const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

      // Parse scopes
      const scopeArray = scope ? scope.split(' ') : [];

      // Upsert account
      const { data, error: dbError } = await supabase
        .from('inbox_accounts')
        .upsert({
          user_key: userKey,
          provider: stateProvider,
          account_email: userEmail,
          account_name: userName,
          account_id: userEmail || `${stateProvider}-${Date.now()}`,
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
        console.error('[inbox-connect] Database error:', dbError);
        return errorResponse(req, 'Failed to save account', 500);
      }

      console.log(`[inbox-connect] Account saved: ${data.id}`);
      return jsonResponse(req, { 
        success: true, 
        account_id: data.id,
        provider: stateProvider, 
        email: userEmail, 
        name: userName 
      });
    }

    // Handle get_auth_url action (Step 1 of OAuth flow) - also handles legacy call without action
    if (!provider) {
      return errorResponse(req, 'Provider is required', 400);
    }

    console.log(`[inbox-connect] User ${userKey} connecting to ${provider}`);

    // Handle OAuth providers
    const oauthConfig = OAUTH_CONFIG[provider];
    
    if (oauthConfig) {
      const clientId = Deno.env.get(oauthConfig.clientIdEnv);
      
      if (!clientId) {
        return errorResponse(req, `${provider} OAuth is not configured. Please add ${oauthConfig.clientIdEnv} to secrets.`, 503);
      }

      // Create a secure nonce bound to this user
      const nonce = await createOAuthNonce(userKey, `inbox_${provider}`);
      
      // Encode state with nonce (not user ID - more secure)
      const encodedState = encodeOAuthState(nonce, provider);

      // Build OAuth URL
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: oauthConfig.scopes.join(' '),
        state: encodedState,
        access_type: 'offline',
        prompt: 'consent',
      });

      const oauthUrl = `${oauthConfig.authUrl}?${params.toString()}`;

      console.log(`[inbox-connect] Generated OAuth URL with nonce for ${provider}`);

      return jsonResponse(req, {
        oauth_url: oauthUrl,
        provider,
      });
    }

    // Handle non-OAuth providers
    switch (provider) {
      case 'telegram':
        return jsonResponse(req, {
          instructions: 'To connect Telegram, you need to set up a Telegram Bot. Go to @BotFather on Telegram, create a new bot, and add the bot token in settings.',
          provider,
          setup_required: true,
        });

      case 'whatsapp':
        return jsonResponse(req, {
          instructions: 'WhatsApp Business API requires a Meta Business account. Visit business.facebook.com to set up WhatsApp Business and obtain API credentials.',
          provider,
          setup_required: true,
        });

      case 'instagram':
        return jsonResponse(req, {
          instructions: 'Instagram messaging requires a Meta Business account and Instagram Professional account. Set up Instagram Graph API access at developers.facebook.com.',
          provider,
          setup_required: true,
        });

      case 'linkedin':
        return jsonResponse(req, {
          instructions: 'LinkedIn messaging API is only available through the LinkedIn Partner Program for Pages messaging. Personal inbox access is not available via API.',
          provider,
          setup_required: true,
          read_only: true,
        });

      default:
        return errorResponse(req, `Unknown provider: ${provider}`, 400);
    }

  } catch (err) {
    console.error('[inbox-connect] Error:', err);
    return errorResponse(req, err instanceof Error ? err.message : 'Internal error', 500);
  }
});

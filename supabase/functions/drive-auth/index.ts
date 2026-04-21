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
import { encrypt, decrypt, isEncrypted } from '../_shared/encryption.ts';
import { 
  createOAuthNonce, 
  validateAndConsumeNonce,
  encodeOAuthState,
  decodeOAuthState,
  cleanupExpiredNonces
} from '../_shared/oauthNonce.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') || Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DriveAuthRequest {
  action: 'get_auth_url' | 'exchange_code' | 'disconnect' | 'list_accounts' | 'refresh_token';
  code?: string;
  state?: string;
  accountId?: string;
}

// Create authenticated Supabase client
function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Refresh access token if expired
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const decryptedRefresh = isEncrypted(refreshToken) ? await decrypt(refreshToken) : refreshToken;
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: decryptedRefresh,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('[drive-auth] Token refresh failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('[drive-auth] Token refresh error:', err);
    return null;
  }
}

// Get user info from Google
async function getUserInfo(accessToken: string): Promise<{ email: string; name: string } | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return { email: data.email, name: data.name || data.email };
  } catch {
    return null;
  }
}

// Get Drive storage quota
async function getStorageQuota(accessToken: string): Promise<{ used: number; total: number } | null> {
  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return {
      used: parseInt(data.storageQuota?.usage || '0'),
      total: parseInt(data.storageQuota?.limit || '0'),
    };
  } catch {
    return null;
  }
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
    
    if (!authResult.authenticated || !authResult.userId) {
      console.error('[drive-auth] Auth failed:', authResult.error);
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    const userKey = authResult.userId;
    const body: DriveAuthRequest = await req.json();
    const { action } = body;

    console.log(`[drive-auth] User ${userKey} action: ${action}`);

    const supabase = getSupabaseClient();

    // Periodically clean up expired nonces
    await cleanupExpiredNonces();

    switch (action) {
      // Step 1: Generate OAuth URL with secure nonce (same pattern as google-calendar-auth)
      case 'get_auth_url': {
        if (!GOOGLE_CLIENT_ID) {
          return errorResponse(req, 'Google Drive is not configured. Please add GOOGLE_DRIVE_CLIENT_ID to secrets.', 503);
        }

        // Create a secure nonce bound to this user
        const nonce = await createOAuthNonce(userKey, 'google_drive');
        
        // Encode state with nonce (not user ID - more secure)
        const encodedState = encodeOAuthState(nonce, 'google_drive');

        const redirectUri = getAllowedRedirectUri(req);
        const params = new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/presentations',
            'https://www.googleapis.com/auth/contacts.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
          ].join(' '),
          state: encodedState,
          access_type: 'offline',
          prompt: 'consent',
        });

        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        console.log('[drive-auth] Generated auth URL with nonce for user_key:', userKey);
        return jsonResponse(req, { oauth_url: oauthUrl });
      }

      // Step 2: Exchange code for tokens - SECURED WITH NONCE VALIDATION (same as google-calendar-auth)
      case 'exchange_code': {
        const { code, state } = body;

        if (!code || !state) {
          return errorResponse(req, 'Missing code or state', 400);
        }

        // Decode and validate the nonce from state
        const { nonce, provider } = decodeOAuthState(state);
        
        if (!nonce || provider !== 'google_drive') {
          console.error('[drive-auth] Invalid state format');
          return errorResponse(req, 'Invalid OAuth state', 400);
        }

        // Validate and consume the nonce (single-use)
        const nonceResult = await validateAndConsumeNonce(nonce, 'google_drive');
        
        if (!nonceResult.valid) {
          console.error('[drive-auth] Nonce validation failed:', nonceResult.error);
          return errorResponse(req, nonceResult.error || 'Invalid or expired OAuth session', 400);
        }

        // CRITICAL: Verify the JWT user matches the nonce user
        if (nonceResult.userId !== userKey) {
          console.error('[drive-auth] User mismatch - nonce user:', nonceResult.userId, 'JWT user:', userKey);
          return errorResponse(req, 'OAuth session mismatch', 400);
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: getAllowedRedirectUri(req),
          }),
        });

        if (!tokenResponse.ok) {
          const errText = await tokenResponse.text();
          console.error('[drive-auth] Token exchange failed:', errText);
          return errorResponse(req, 'Failed to exchange code for tokens', 400);
        }

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          console.error('[drive-auth] Token error:', tokens);
          return errorResponse(req, tokens.error_description || tokens.error, 400);
        }
        
        // Get user info
        const userInfo = await getUserInfo(tokens.access_token);
        if (!userInfo) {
          return errorResponse(req, 'Failed to get user info', 500);
        }

        // Get storage quota
        const quota = await getStorageQuota(tokens.access_token);

        // Encrypt tokens
        const encryptedAccess = await encrypt(tokens.access_token);
        const encryptedRefresh = tokens.refresh_token ? await encrypt(tokens.refresh_token) : null;

        // Calculate token expiry
        const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

        // Upsert drive account
        const { error: upsertError } = await supabase
          .from('drive_accounts')
          .upsert({
            user_key: userKey,
            account_email: userInfo.email,
            account_name: userInfo.name,
            access_token: encryptedAccess,
            refresh_token: encryptedRefresh,
            token_expires_at: expiresAt,
            storage_quota_used: quota?.used || null,
            storage_quota_total: quota?.total || null,
            enabled: true,
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'user_key,account_email',
          });

        if (upsertError) {
          console.error('[drive-auth] Failed to save account:', upsertError);
          return errorResponse(req, 'Failed to save account', 500);
        }

        console.log(`[drive-auth] Successfully connected Google Drive for ${userInfo.email}`);
        return jsonResponse(req, { success: true, email: userInfo.email, name: userInfo.name });
      }

      case 'list_accounts': {
        const { data: accounts, error } = await supabase
          .from('drive_accounts_safe')
          .select('*')
          .eq('user_key', userKey)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[drive-auth] Failed to list accounts:', error);
          return errorResponse(req, 'Failed to list accounts', 500);
        }

        return jsonResponse(req, { accounts: accounts || [] });
      }

      case 'disconnect': {
        const { accountId } = body;
        
        if (!accountId) {
          return errorResponse(req, 'Account ID is required', 400);
        }

        // Delete drive files first (cascade should handle this, but be explicit)
        await supabase
          .from('drive_files')
          .delete()
          .eq('drive_account_id', accountId)
          .eq('user_key', userKey);

        // Delete the account
        const { error } = await supabase
          .from('drive_accounts')
          .delete()
          .eq('id', accountId)
          .eq('user_key', userKey);

        if (error) {
          console.error('[drive-auth] Failed to disconnect:', error);
          return errorResponse(req, 'Failed to disconnect account', 500);
        }

        console.log(`[drive-auth] Disconnected account ${accountId}`);
        return jsonResponse(req, { success: true });
      }

      case 'refresh_token': {
        const { accountId } = body;
        
        if (!accountId) {
          return errorResponse(req, 'Account ID is required', 400);
        }

        // Get account with tokens
        const { data: account, error: fetchError } = await supabase
          .from('drive_accounts')
          .select('*')
          .eq('id', accountId)
          .eq('user_key', userKey)
          .single();

        if (fetchError || !account) {
          return errorResponse(req, 'Account not found', 404);
        }

        if (!account.refresh_token) {
          return errorResponse(req, 'No refresh token available', 400);
        }

        const refreshed = await refreshAccessToken(account.refresh_token);
        
        if (!refreshed) {
          // Mark account as needing reconnection (structured payload — UI shows Reconnect badge)
          const payload = JSON.stringify({
            reason: 'auth_expired',
            message: 'Google Drive token refresh failed. Please reconnect this account.',
            reconnectRequired: true,
            at: new Date().toISOString(),
          });
          await supabase
            .from('drive_accounts')
            .update({ last_sync_error: payload })
            .eq('id', accountId);
          
          return errorResponse(req, 'Token refresh failed - please reconnect the account', 401);
        }

        // Update tokens
        const encryptedAccess = await encrypt(refreshed.access_token);
        const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

        await supabase
          .from('drive_accounts')
          .update({
            access_token: encryptedAccess,
            token_expires_at: expiresAt,
            last_sync_error: null,
          })
          .eq('id', accountId);

        return jsonResponse(req, { success: true, expires_at: expiresAt });
      }

      default:
        return errorResponse(req, `Unknown action: ${action}`, 400);
    }

  } catch (err) {
    console.error('[drive-auth] Error:', err);
    return errorResponse(req, err instanceof Error ? err.message : 'Internal error', 500);
  }
});

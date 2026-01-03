import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyArloJWT, handleCorsOptions, jsonResponse, unauthorizedResponse, errorResponse } from '../_shared/arloAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type InboxProvider = 'gmail' | 'outlook' | 'teams' | 'whatsapp' | 'telegram' | 'instagram' | 'linkedin';

interface ConnectRequest {
  provider: InboxProvider;
}

// OAuth configuration per provider
const OAUTH_CONFIG: Record<string, {
  authUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
}> = {
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  },
  outlook: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
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

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    // Verify JWT
    const authResult = await verifyArloJWT(req);
    if (!authResult.authenticated || !authResult.userKey) {
      return unauthorizedResponse(req, 'Authentication required');
    }

    const userKey = authResult.userKey;
    const { provider }: ConnectRequest = await req.json();

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

      // Generate state with user info for callback
      const state = btoa(JSON.stringify({
        userKey,
        provider,
        timestamp: Date.now(),
      }));

      // Build OAuth URL
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/inbox-oauth-callback`;
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: oauthConfig.scopes.join(' '),
        state,
        access_type: 'offline',
        prompt: 'consent',
      });

      const oauthUrl = `${oauthConfig.authUrl}?${params.toString()}`;

      console.log(`[inbox-connect] Generated OAuth URL for ${provider}`);

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

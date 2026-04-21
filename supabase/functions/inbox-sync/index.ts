import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyArloJWT, handleCorsOptions, jsonResponse, unauthorizedResponse, errorResponse } from '../_shared/arloAuth.ts';
import { decrypt, encrypt } from '../_shared/encryption.ts';
import { classifyException, buildSyncErrorPayload, type ClassifiedError } from '../_shared/providerErrors.ts';

type InboxProvider = 'gmail' | 'outlook' | 'teams';

interface SyncRequest {
  account_id: string;
  sync_type: 'initial' | 'incremental';
}

// Token refresh endpoints
const TOKEN_REFRESH_ENDPOINTS: Record<string, string> = {
  gmail: 'https://oauth2.googleapis.com/token',
  outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  teams: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

async function refreshAccessToken(
  provider: InboxProvider, 
  refreshToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const clientIdEnv = provider === 'gmail' ? 'GMAIL_CLIENT_ID' : 'MICROSOFT_CLIENT_ID';
  const clientSecretEnv = provider === 'gmail' ? 'GMAIL_CLIENT_SECRET' : 'MICROSOFT_CLIENT_SECRET';
  
  const clientId = Deno.env.get(clientIdEnv);
  const clientSecret = Deno.env.get(clientSecretEnv);
  
  if (!clientId || !clientSecret) {
    console.error(`[inbox-sync] Missing credentials for ${provider}`);
    return null;
  }

  const response = await fetch(TOKEN_REFRESH_ENDPOINTS[provider], {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error(`[inbox-sync] Token refresh failed:`, await response.text());
    return null;
  }

  return await response.json();
}

async function syncGmailMessages(
  accessToken: string, 
  syncCursor: string | null,
  accountId: string,
  userKey: string,
  supabase: any
): Promise<{ cursor: string; threadsSynced: number; messagesSynced: number }> {
  const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
  let threadsSynced = 0;
  let messagesSynced = 0;
  let newCursor = syncCursor || '';

  try {
    // Get threads list
    const params = new URLSearchParams({
      maxResults: '50',
      ...(syncCursor ? {} : { q: 'in:inbox' }),
    });

    const threadsResponse = await fetch(`${baseUrl}/threads?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!threadsResponse.ok) {
      throw new Error(`Gmail API error: ${await threadsResponse.text()}`);
    }

    const threadsData = await threadsResponse.json();
    const threads = threadsData.threads || [];

    for (const threadSummary of threads.slice(0, 20)) { // Limit for initial sync
      // Get full thread
      const threadResponse = await fetch(`${baseUrl}/threads/${threadSummary.id}?format=metadata`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!threadResponse.ok) continue;

      const thread = await threadResponse.json();
      const messages = thread.messages || [];
      
      if (messages.length === 0) continue;

      // Extract thread metadata
      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      
      const getHeader = (msg: any, name: string) => 
        msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader(firstMessage, 'Subject');
      const from = getHeader(lastMessage, 'From');
      
      // Parse sender
      const senderMatch = from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
      const senderName = senderMatch?.[1] || senderMatch?.[2] || from;
      const senderEmail = senderMatch?.[2] || from;

      // Upsert thread
      const { data: threadData, error: threadError } = await supabase
        .from('inbox_threads')
        .upsert({
          user_key: userKey,
          account_id: accountId,
          provider: 'gmail',
          external_thread_id: thread.id,
          subject: subject || 'No subject',
          snippet: thread.snippet || '',
          participants: [{ name: senderName, email: senderEmail }],
          unread_count: messages.filter((m: any) => m.labelIds?.includes('UNREAD')).length,
          message_count: messages.length,
          labels: messages[0].labelIds || [],
          last_message_at: new Date(parseInt(lastMessage.internalDate)).toISOString(),
        }, {
          onConflict: 'account_id,external_thread_id',
        })
        .select('id')
        .single();

      if (threadError) {
        console.error('[inbox-sync] Thread upsert error:', threadError);
        continue;
      }

      threadsSynced++;

      // Sync messages
      for (const msg of messages.slice(-10)) { // Last 10 messages per thread
        const msgFrom = getHeader(msg, 'From');
        const msgSenderMatch = msgFrom.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
        
        const { error: msgError } = await supabase
          .from('inbox_messages')
          .upsert({
            user_key: userKey,
            thread_id: threadData.id,
            account_id: accountId,
            provider: 'gmail',
            external_message_id: msg.id,
            sender: {
              name: msgSenderMatch?.[1] || msgSenderMatch?.[2] || msgFrom,
              email: msgSenderMatch?.[2] || msgFrom,
            },
            recipients: [],
            subject: getHeader(msg, 'Subject'),
            body_text: msg.snippet || '',
            is_read: !msg.labelIds?.includes('UNREAD'),
            is_outgoing: msg.labelIds?.includes('SENT'),
            sent_at: new Date(parseInt(msg.internalDate)).toISOString(),
          }, {
            onConflict: 'account_id,external_message_id',
          });

        if (!msgError) messagesSynced++;
      }
    }

    // Get historyId for incremental sync
    const profileResponse = await fetch(`${baseUrl}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      newCursor = profile.historyId || '';
    }

  } catch (err) {
    console.error('[inbox-sync] Gmail sync error:', err);
    throw err;
  }

  return { cursor: newCursor, threadsSynced, messagesSynced };
}

async function syncOutlookMessages(
  accessToken: string,
  syncCursor: string | null,
  accountId: string,
  userKey: string,
  supabase: any
): Promise<{ cursor: string; threadsSynced: number; messagesSynced: number }> {
  const baseUrl = 'https://graph.microsoft.com/v1.0/me';
  let threadsSynced = 0;
  let messagesSynced = 0;
  let newCursor = '';

  try {
    // Use delta query if we have a cursor, otherwise get recent messages
    const endpoint = syncCursor 
      ? syncCursor 
      : `${baseUrl}/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime desc`;

    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Graph API error: ${await response.text()}`);
    }

    const data = await response.json();
    const messages = data.value || [];

    // Group messages by conversation
    const conversationMap = new Map<string, any[]>();
    
    for (const msg of messages) {
      const convId = msg.conversationId || msg.id;
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, []);
      }
      conversationMap.get(convId)!.push(msg);
    }

    for (const [convId, convMessages] of conversationMap) {
      const lastMessage = convMessages[0]; // Most recent
      const firstMessage = convMessages[convMessages.length - 1];

      // Upsert thread
      const { data: threadData, error: threadError } = await supabase
        .from('inbox_threads')
        .upsert({
          user_key: userKey,
          account_id: accountId,
          provider: 'outlook',
          external_thread_id: convId,
          subject: firstMessage.subject || 'No subject',
          snippet: lastMessage.bodyPreview || '',
          participants: [{
            name: lastMessage.from?.emailAddress?.name || '',
            email: lastMessage.from?.emailAddress?.address || '',
          }],
          unread_count: convMessages.filter((m: any) => !m.isRead).length,
          message_count: convMessages.length,
          last_message_at: lastMessage.receivedDateTime,
        }, {
          onConflict: 'account_id,external_thread_id',
        })
        .select('id')
        .single();

      if (threadError) continue;

      threadsSynced++;

      // Sync messages
      for (const msg of convMessages) {
        const { error: msgError } = await supabase
          .from('inbox_messages')
          .upsert({
            user_key: userKey,
            thread_id: threadData.id,
            account_id: accountId,
            provider: 'outlook',
            external_message_id: msg.id,
            sender: {
              name: msg.from?.emailAddress?.name || '',
              email: msg.from?.emailAddress?.address || '',
            },
            recipients: (msg.toRecipients || []).map((r: any) => ({
              name: r.emailAddress?.name || '',
              email: r.emailAddress?.address || '',
            })),
            subject: msg.subject,
            body_text: msg.bodyPreview || '',
            body_html: msg.body?.contentType === 'html' ? msg.body?.content : undefined,
            is_read: msg.isRead,
            is_outgoing: false,
            sent_at: msg.sentDateTime || msg.receivedDateTime,
          }, {
            onConflict: 'account_id,external_message_id',
          });

        if (!msgError) messagesSynced++;
      }
    }

    // Get delta link for next sync
    newCursor = data['@odata.deltaLink'] || data['@odata.nextLink'] || '';

  } catch (err) {
    console.error('[inbox-sync] Outlook sync error:', err);
    throw err;
  }

  return { cursor: newCursor, threadsSynced, messagesSynced };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    // Verify JWT
    const authResult = await verifyArloJWT(req);
    if (!authResult.authenticated || !authResult.userId) {
      console.log('[inbox-sync] Auth failed, returning 401');
      return unauthorizedResponse(req, 'Authentication required');
    }

    const userKey = authResult.userId; // userId from JWT.sub is the user_key
    console.log(`[inbox-sync] Auth successful for: ${userKey}`);
    
    // Parse request body
    let requestBody: SyncRequest;
    try {
      requestBody = await req.json();
      console.log('[inbox-sync] Request body:', JSON.stringify(requestBody));
    } catch (parseError) {
      console.error('[inbox-sync] Failed to parse request body:', parseError);
      return errorResponse(req, 'Invalid request body', 400);
    }
    
    const { account_id, sync_type = 'incremental' } = requestBody;

    if (!account_id) {
      console.log('[inbox-sync] Missing account_id');
      return errorResponse(req, 'account_id is required', 400);
    }

    console.log(`[inbox-sync] Starting ${sync_type} sync for account ${account_id}`);

    // Get account with encrypted tokens
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: account, error: accountError } = await supabase
      .from('inbox_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_key', userKey)
      .single();

    if (accountError || !account) {
      return errorResponse(req, 'Account not found', 404);
    }

    // Decrypt tokens
    let accessToken: string;
    let refreshToken: string | null = null;
    
    try {
      accessToken = await decrypt(account.access_token);
      if (account.refresh_token) {
        refreshToken = await decrypt(account.refresh_token);
      }
      console.log('[inbox-sync] Tokens decrypted successfully');
    } catch (decryptError) {
      console.error('[inbox-sync] Token decryption failed:', decryptError);
      const classified: ClassifiedError = {
        reason: 'auth_invalid',
        message: 'Stored credentials could not be read. Please reconnect this account.',
        reconnectRequired: true,
        status: 200,
      };
      await supabase
        .from('inbox_accounts')
        .update({ last_sync_error: buildSyncErrorPayload(classified) })
        .eq('id', account_id);
      return jsonResponse(req, { fallback: true, ...classified });
    }
    
    if (!accessToken) {
      console.error('[inbox-sync] Access token is empty after decryption');
      const classified: ClassifiedError = {
        reason: 'auth_invalid',
        message: 'Invalid access token. Please reconnect this account.',
        reconnectRequired: true,
        status: 200,
      };
      await supabase
        .from('inbox_accounts')
        .update({ last_sync_error: buildSyncErrorPayload(classified) })
        .eq('id', account_id);
      return jsonResponse(req, { fallback: true, ...classified });
    }

    // Check if token needs refresh
    let currentAccessToken = accessToken;
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      console.log('[inbox-sync] Token expired, refreshing...');
      
      if (!refreshToken) {
        const classified: ClassifiedError = {
          reason: 'auth_expired',
          message: 'Access token expired and no refresh token is stored. Please reconnect.',
          reconnectRequired: true,
          status: 200,
        };
        await supabase
          .from('inbox_accounts')
          .update({ last_sync_error: buildSyncErrorPayload(classified) })
          .eq('id', account_id);
        return jsonResponse(req, { fallback: true, ...classified });
      }

      const newTokens = await refreshAccessToken(account.provider, refreshToken);
      
      if (!newTokens) {
        const classified: ClassifiedError = {
          reason: 'auth_expired',
          message: 'Token refresh failed. Please reconnect this account.',
          reconnectRequired: true,
          status: 200,
        };
        await supabase
          .from('inbox_accounts')
          .update({ last_sync_error: buildSyncErrorPayload(classified) })
          .eq('id', account_id);
        return jsonResponse(req, { fallback: true, ...classified });
      }

      currentAccessToken = newTokens.access_token;
      
      // Update stored tokens
      await supabase
        .from('inbox_accounts')
        .update({
          access_token: await encrypt(newTokens.access_token),
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', account_id);
    }

    // Update sync state
    await supabase
      .from('inbox_sync_state')
      .upsert({
        user_key: userKey,
        account_id: account_id,
        sync_type,
        status: 'running',
        started_at: new Date().toISOString(),
      }, {
        onConflict: 'account_id,sync_type',
      });

    // Perform sync based on provider
    let result: { cursor: string; threadsSynced: number; messagesSynced: number };

    switch (account.provider) {
      case 'gmail':
        result = await syncGmailMessages(
          currentAccessToken,
          sync_type === 'incremental' ? account.sync_cursor : null,
          account_id,
          userKey,
          supabase
        );
        break;

      case 'outlook':
      case 'teams':
        result = await syncOutlookMessages(
          currentAccessToken,
          sync_type === 'incremental' ? account.sync_cursor : null,
          account_id,
          userKey,
          supabase
        );
        break;

      default:
        return errorResponse(req, `Sync not implemented for ${account.provider}`, 501);
    }

    // Update account with sync results
    await supabase
      .from('inbox_accounts')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
        sync_cursor: result.cursor,
      })
      .eq('id', account_id);

    // Update sync state
    await supabase
      .from('inbox_sync_state')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        threads_synced: result.threadsSynced,
        messages_synced: result.messagesSynced,
      })
      .eq('account_id', account_id)
      .eq('sync_type', sync_type);

    console.log(`[inbox-sync] Completed: ${result.threadsSynced} threads, ${result.messagesSynced} messages`);

    return jsonResponse(req, {
      success: true,
      threads_synced: result.threadsSynced,
      messages_synced: result.messagesSynced,
    });

  } catch (err) {
    console.error('[inbox-sync] Error:', err);
    const classified = classifyException(err);
    // Best-effort: update integration row if we know the account_id from the body.
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && supabaseServiceKey) {
        const sb = createClient(supabaseUrl, supabaseServiceKey);
        // accountId not in scope here — only update if available via re-parse
      }
    } catch {/* ignore */}
    return jsonResponse(req, { fallback: true, ...classified });
  }
});

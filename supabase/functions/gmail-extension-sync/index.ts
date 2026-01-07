/**
 * Gmail Extension Sync - Edge Function
 * 
 * Handles saving threads from the Chrome extension to Arlo's inbox.
 * Reuses existing inbox schema and authentication.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyArloJWT, handleCorsOptions, jsonResponse, unauthorizedResponse, errorResponse } from '../_shared/arloAuth.ts';

interface SaveThreadRequest {
  action: 'save_thread';
  thread: {
    external_thread_id: string;
    subject: string;
    snippet: string;
    participants: Array<{ name: string; email: string }>;
    message_count: number;
    unread_count: number;
    labels: string[];
    last_message_at: string;
    messages: Array<{
      id: string;
      threadId: string;
      subject?: string;
      from: { name: string; email: string };
      to?: string;
      date: string;
      snippet: string;
      bodyText: string;
      bodyHtml?: string;
      labels: string[];
      isRead: boolean;
    }>;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    const authResult = await verifyArloJWT(req);
    if (!authResult.authenticated || !authResult.userId) {
      return unauthorizedResponse(req, 'Authentication required');
    }

    const userKey = authResult.userId;
    const body: SaveThreadRequest = await req.json();

    if (body.action !== 'save_thread' || !body.thread) {
      return errorResponse(req, 'Invalid request', 400);
    }

    const { thread } = body;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get or create extension account for this user
    let { data: account } = await supabase
      .from('inbox_accounts')
      .select('id')
      .eq('user_key', userKey)
      .eq('provider', 'gmail')
      .eq('account_id', 'chrome-extension')
      .single();

    if (!account) {
      const { data: newAccount, error: accountError } = await supabase
        .from('inbox_accounts')
        .insert({
          user_key: userKey,
          provider: 'gmail',
          account_name: 'Gmail (Extension)',
          account_id: 'chrome-extension',
          enabled: true,
        })
        .select('id')
        .single();

      if (accountError) {
        return errorResponse(req, 'Failed to create account', 500);
      }
      account = newAccount;
    }

    // Upsert thread
    const { data: threadData, error: threadError } = await supabase
      .from('inbox_threads')
      .upsert({
        user_key: userKey,
        account_id: account.id,
        provider: 'gmail',
        external_thread_id: thread.external_thread_id,
        subject: thread.subject,
        snippet: thread.snippet,
        participants: thread.participants,
        unread_count: thread.unread_count,
        message_count: thread.message_count,
        labels: thread.labels,
        last_message_at: thread.last_message_at,
      }, { onConflict: 'account_id,external_thread_id' })
      .select('id')
      .single();

    if (threadError) {
      return errorResponse(req, 'Failed to save thread', 500);
    }

    // Upsert messages
    for (const msg of thread.messages) {
      await supabase.from('inbox_messages').upsert({
        user_key: userKey,
        thread_id: threadData.id,
        account_id: account.id,
        provider: 'gmail',
        external_message_id: msg.id,
        sender: msg.from,
        recipients: [],
        subject: msg.subject,
        body_text: msg.bodyText,
        body_html: msg.bodyHtml,
        is_read: msg.isRead,
        is_outgoing: msg.labels?.includes('SENT') || false,
        sent_at: msg.date,
      }, { onConflict: 'account_id,external_message_id' });
    }

    return jsonResponse(req, { success: true, thread_id: threadData.id });
  } catch (err) {
    console.error('[gmail-extension-sync] Error:', err);
    return errorResponse(req, err instanceof Error ? err.message : 'Internal error', 500);
  }
});

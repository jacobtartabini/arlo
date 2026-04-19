import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyArloJWT, handleCorsOptions, jsonResponse, unauthorizedResponse, errorResponse } from '../_shared/arloAuth.ts';
import { decrypt, encrypt } from '../_shared/encryption.ts';

type InboxProvider = 'gmail' | 'outlook' | 'teams';

interface SendRequest {
  account_id: string;
  thread_id: string;
  content: string;
  subject?: string;
  recipients?: { email: string; name?: string }[];
}

async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<{ messageId: string }> {
  // Build raw email
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ];
  
  const rawEmail = btoa(emailLines.join('\r\n'))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody: any = { raw: rawEmail };
  if (threadId) {
    requestBody.threadId = threadId;
  }

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail send failed: ${error}`);
  }

  const result = await response.json();
  return { messageId: result.id };
}

async function sendOutlookMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  replyToMessageId?: string
): Promise<{ messageId: string }> {
  const endpoint = replyToMessageId
    ? `https://graph.microsoft.com/v1.0/me/messages/${replyToMessageId}/reply`
    : 'https://graph.microsoft.com/v1.0/me/sendMail';

  const requestBody = replyToMessageId
    ? { comment: body }
    : {
        message: {
          subject,
          body: { contentType: 'Text', content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Outlook send failed: ${error}`);
  }

  return { messageId: replyToMessageId || 'sent' };
}

async function sendTeamsMessage(
  accessToken: string,
  chatId: string,
  content: string
): Promise<{ messageId: string }> {
  const response = await fetch(`https://graph.microsoft.com/v1.0/chats/${chatId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body: { content },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Teams send failed: ${error}`);
  }

  const result = await response.json();
  return { messageId: result.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    // Verify JWT
    const authResult = await verifyArloJWT(req);
    if (!authResult.authenticated || !authResult.userId) {
      return unauthorizedResponse(req, 'Authentication required');
    }

    const userKey = authResult.userId;
    const { account_id, thread_id, content, subject, recipients }: SendRequest = await req.json();

    if (!account_id || !thread_id || !content) {
      return errorResponse(req, 'account_id, thread_id, and content are required', 400);
    }

    console.log(`[inbox-send] Sending message for thread ${thread_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get account with tokens
    const { data: account, error: accountError } = await supabase
      .from('inbox_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_key', userKey)
      .single();

    if (accountError || !account) {
      return errorResponse(req, 'Account not found', 404);
    }

    // Get thread for context
    const { data: thread, error: threadError } = await supabase
      .from('inbox_threads')
      .select('*, inbox_messages(*)')
      .eq('id', thread_id)
      .eq('user_key', userKey)
      .single();

    if (threadError || !thread) {
      return errorResponse(req, 'Thread not found', 404);
    }

    // Decrypt access token
    const accessToken = await decrypt(account.access_token);

    // Get recipient from thread or request
    const recipient = recipients?.[0]?.email || 
      thread.participants?.[0]?.email ||
      thread.inbox_messages?.[0]?.sender?.email;

    if (!recipient) {
      return errorResponse(req, 'Could not determine recipient', 400);
    }

    let result: { messageId: string };

    switch (account.provider) {
      case 'gmail':
        result = await sendGmailMessage(
          accessToken,
          recipient,
          subject || thread.subject || 'Re: ' + (thread.subject || ''),
          content,
          thread.external_thread_id
        );
        break;

      case 'outlook':
        // Find last message ID for reply
        const lastMessage = thread.inbox_messages
          ?.filter((m: any) => !m.is_outgoing)
          .sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];
        
        result = await sendOutlookMessage(
          accessToken,
          recipient,
          subject || thread.subject || '',
          content,
          lastMessage?.external_message_id
        );
        break;

      case 'teams':
        result = await sendTeamsMessage(
          accessToken,
          thread.external_thread_id,
          content
        );
        break;

      default:
        return errorResponse(req, `Sending not supported for ${account.provider}`, 501);
    }

    // Save sent message to database
    const { error: msgError } = await supabase
      .from('inbox_messages')
      .insert({
        user_key: userKey,
        thread_id: thread_id,
        account_id: account_id,
        provider: account.provider,
        external_message_id: result.messageId,
        sender: {
          name: account.account_name,
          email: account.account_email,
        },
        recipients: [{ email: recipient }],
        subject: subject || thread.subject,
        body_text: content,
        is_read: true,
        is_outgoing: true,
        sent_at: new Date().toISOString(),
      });

    if (msgError) {
      console.error('[inbox-send] Failed to save message:', msgError);
    }

    // Update thread
    await supabase
      .from('inbox_threads')
      .update({
        message_count: (thread.message_count || 0) + 1,
        last_message_at: new Date().toISOString(),
        snippet: content.substring(0, 100),
      })
      .eq('id', thread_id);

    console.log(`[inbox-send] Message sent: ${result.messageId}`);

    return jsonResponse(req, {
      success: true,
      message_id: result.messageId,
    });

  } catch (err) {
    console.error('[inbox-send] Error:', err);
    return errorResponse(req, err instanceof Error ? err.message : 'Send failed', 500);
  }
});

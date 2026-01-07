/**
 * Supabase API helpers for Chrome Extension
 * 
 * Communicates with Supabase Edge Functions using the same
 * authentication as the main Arlo app.
 */

import { getAuthHeaders, getUserKey, SUPABASE_URL } from './auth.js';

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Call edge function
async function callEdgeFunction(functionName, body = {}) {
  const headers = await getAuthHeaders();
  
  if (!headers) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Get connected inbox accounts
export async function getInboxAccounts() {
  return callEdgeFunction('data-api', {
    action: 'select',
    table: 'inbox_accounts_safe',
    filters: {},
    order: { column: 'created_at', ascending: false },
  });
}

// Connect Gmail account
export async function connectGmail() {
  return callEdgeFunction('inbox-connect', {
    action: 'get_auth_url',
    provider: 'gmail',
  });
}

// Exchange OAuth code for tokens
export async function exchangeOAuthCode(code, state) {
  return callEdgeFunction('inbox-connect', {
    action: 'exchange_code',
    code,
    state,
  });
}

// Sync Gmail messages
export async function syncGmailMessages(accountId, syncType = 'incremental') {
  return callEdgeFunction('inbox-sync', {
    account_id: accountId,
    sync_type: syncType,
  });
}

// Save thread to Arlo (via extension-specific endpoint)
export async function saveThreadToArlo(threadData) {
  return callEdgeFunction('gmail-extension-sync', {
    action: 'save_thread',
    thread: threadData,
  });
}

// Get inbox threads
export async function getInboxThreads(filters = {}) {
  const userKey = await getUserKey();
  
  return callEdgeFunction('data-api', {
    action: 'select',
    table: 'inbox_threads',
    filters: {
      user_key: userKey,
      is_archived: false,
      ...filters,
    },
    order: { column: 'last_message_at', ascending: false },
    limit: 50,
  });
}

// Disconnect account
export async function disconnectAccount(accountId) {
  return callEdgeFunction('data-api', {
    action: 'delete',
    table: 'inbox_accounts',
    filters: { id: accountId },
  });
}

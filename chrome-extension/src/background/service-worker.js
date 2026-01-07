/**
 * Arlo for Gmail - Service Worker
 * 
 * Handles background tasks, message passing, and OAuth flows.
 */

import { 
  getArloToken, 
  verifyArloAuth, 
  getIdentity, 
  logout as arloLogout,
  getCachedToken,
  isAuthenticated as checkArloAuth
} from '../lib/auth.js';

import {
  getGmailToken,
  getGmailTokenInteractive,
  revokeGmailToken,
  isGmailConnected,
  getGmailUserInfo,
  getThread,
  listThreads,
  parseHeaders,
  extractBody,
  parseSender
} from '../lib/gmail.js';

import {
  getInboxAccounts,
  syncGmailMessages,
  saveThreadToArlo,
  disconnectAccount
} from '../lib/supabase.js';

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep the message channel open for async response
});

async function handleMessage(message, sender) {
  const { action, data } = message;
  
  try {
    switch (action) {
      case 'getStatus':
        return await getStatus();
      
      case 'connectArlo':
        return await connectArlo();
      
      case 'disconnectArlo':
        return await disconnectArlo();
      
      case 'connectGmail':
        return await connectGmail();
      
      case 'disconnectGmail':
        return await disconnectGmail();
      
      case 'syncEmails':
        return await syncEmails(data?.count || 10);
      
      case 'sendThreadToArlo':
        return await sendThreadToArlo(data?.threadId);
      
      case 'getThreadDetails':
        return await getThreadDetails(data?.threadId);
      
      default:
        return { error: `Unknown action: ${action}` };
    }
  } catch (error) {
    console.error(`[service-worker] Error handling ${action}:`, error);
    return { error: error.message };
  }
}

// Get current status
async function getStatus() {
  const arloConnected = await checkArloAuth();
  const gmailConnected = await isGmailConnected();
  
  let arloIdentity = null;
  let gmailUser = null;
  let accounts = [];
  
  if (arloConnected) {
    arloIdentity = await getIdentity();
    
    try {
      const result = await getInboxAccounts();
      accounts = result.data || [];
    } catch (e) {
      console.warn('[service-worker] Failed to fetch accounts:', e);
    }
  }
  
  if (gmailConnected) {
    try {
      gmailUser = await getGmailUserInfo();
    } catch (e) {
      console.warn('[service-worker] Failed to fetch Gmail user:', e);
    }
  }
  
  return {
    arloConnected,
    gmailConnected,
    arloIdentity,
    gmailUser,
    accounts,
  };
}

// Connect to Arlo (triggers Tailscale auth)
async function connectArlo() {
  const success = await verifyArloAuth();
  
  if (success) {
    const identity = await getIdentity();
    return { success: true, identity };
  } else {
    return { 
      success: false, 
      error: 'Failed to authenticate with Arlo. Make sure you are connected to Tailscale.' 
    };
  }
}

// Disconnect from Arlo
async function disconnectArlo() {
  await arloLogout();
  return { success: true };
}

// Connect Gmail using chrome.identity
async function connectGmail() {
  try {
    const token = await getGmailTokenInteractive();
    
    if (token) {
      const userInfo = await getGmailUserInfo();
      return { success: true, user: userInfo };
    } else {
      return { success: false, error: 'No token received' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Disconnect Gmail
async function disconnectGmail() {
  await revokeGmailToken();
  return { success: true };
}

// Sync recent emails
async function syncEmails(count = 10) {
  const arloConnected = await checkArloAuth();
  const gmailConnected = await isGmailConnected();
  
  if (!arloConnected) {
    return { error: 'Not connected to Arlo' };
  }
  
  if (!gmailConnected) {
    return { error: 'Gmail not connected' };
  }
  
  try {
    // Get recent threads from Gmail
    const threadsResult = await listThreads({ maxResults: count.toString() });
    const threads = threadsResult.threads || [];
    
    let synced = 0;
    
    for (const threadSummary of threads) {
      try {
        const thread = await getThread(threadSummary.id);
        await saveThreadToArloDb(thread);
        synced++;
      } catch (e) {
        console.warn(`[service-worker] Failed to sync thread ${threadSummary.id}:`, e);
      }
    }
    
    return { success: true, synced };
  } catch (error) {
    return { error: error.message };
  }
}

// Send specific thread to Arlo
async function sendThreadToArlo(threadId) {
  if (!threadId) {
    return { error: 'No thread ID provided' };
  }
  
  const arloConnected = await checkArloAuth();
  
  if (!arloConnected) {
    return { error: 'Not connected to Arlo' };
  }
  
  try {
    const thread = await getThread(threadId);
    await saveThreadToArloDb(thread);
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

// Get thread details for display
async function getThreadDetails(threadId) {
  if (!threadId) {
    return { error: 'No thread ID provided' };
  }
  
  try {
    const thread = await getThread(threadId);
    return { success: true, thread: formatThread(thread) };
  } catch (error) {
    return { error: error.message };
  }
}

// Format thread for display
function formatThread(thread) {
  const messages = thread.messages || [];
  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];
  
  const firstHeaders = parseHeaders(firstMessage?.payload?.headers);
  const lastHeaders = parseHeaders(lastMessage?.payload?.headers);
  
  return {
    id: thread.id,
    subject: firstHeaders.subject || 'No subject',
    snippet: thread.snippet || '',
    messageCount: messages.length,
    from: parseSender(lastHeaders.from),
    date: lastHeaders.date,
    labels: lastMessage?.labelIds || [],
  };
}

// Save thread to Arlo database
async function saveThreadToArloDb(thread) {
  const messages = thread.messages || [];
  
  if (messages.length === 0) {
    throw new Error('Thread has no messages');
  }
  
  const formattedMessages = messages.map(msg => {
    const headers = parseHeaders(msg.payload?.headers);
    const { textBody, htmlBody } = extractBody(msg.payload);
    
    return {
      id: msg.id,
      threadId: thread.id,
      subject: headers.subject,
      from: parseSender(headers.from),
      to: headers.to,
      date: new Date(parseInt(msg.internalDate)).toISOString(),
      snippet: msg.snippet,
      bodyText: textBody,
      bodyHtml: htmlBody,
      labels: msg.labelIds || [],
      isRead: !msg.labelIds?.includes('UNREAD'),
    };
  });
  
  const firstMsg = formattedMessages[0];
  const lastMsg = formattedMessages[formattedMessages.length - 1];
  
  const threadData = {
    external_thread_id: thread.id,
    subject: firstMsg.subject || 'No subject',
    snippet: thread.snippet || '',
    participants: [lastMsg.from],
    message_count: messages.length,
    unread_count: formattedMessages.filter(m => !m.isRead).length,
    labels: lastMsg.labels,
    last_message_at: lastMsg.date,
    messages: formattedMessages,
  };
  
  return await saveThreadToArlo(threadData);
}

// Listen for install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[service-worker] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[service-worker] Extension updated to', chrome.runtime.getManifest().version);
  }
});

// Keep service worker alive during auth flows
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'keepAlive') {
    port.onDisconnect.addListener(() => {
      // Connection closed
    });
  }
});

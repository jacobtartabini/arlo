/**
 * Gmail API helpers for Chrome Extension
 * 
 * Uses chrome.identity for OAuth token management
 */

// Get Gmail OAuth token using chrome.identity
export async function getGmailToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

// Get Gmail token interactively (prompts user if needed)
export async function getGmailTokenInteractive() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

// Revoke Gmail token
export async function revokeGmailToken() {
  const token = await getGmailToken().catch(() => null);
  
  if (token) {
    return new Promise((resolve) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        // Also revoke on Google's end
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
          .finally(resolve);
      });
    });
  }
}

// Check if Gmail is connected
export async function isGmailConnected() {
  try {
    const token = await getGmailToken();
    return !!token;
  } catch {
    return false;
  }
}

// Gmail API base URL
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Get user profile
export async function getGmailProfile() {
  const token = await getGmailToken();
  
  const response = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Gmail profile');
  }
  
  return response.json();
}

// Get user info (email, name)
export async function getGmailUserInfo() {
  const token = await getGmailToken();
  
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user info');
  }
  
  return response.json();
}

// List threads
export async function listThreads(options = {}) {
  const token = await getGmailToken();
  const params = new URLSearchParams({
    maxResults: options.maxResults || '20',
    ...(options.q && { q: options.q }),
    ...(options.pageToken && { pageToken: options.pageToken }),
  });
  
  const response = await fetch(`${GMAIL_API}/threads?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to list threads');
  }
  
  return response.json();
}

// Get thread details
export async function getThread(threadId) {
  const token = await getGmailToken();
  
  const response = await fetch(`${GMAIL_API}/threads/${threadId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get thread');
  }
  
  return response.json();
}

// Get message details
export async function getMessage(messageId) {
  const token = await getGmailToken();
  
  const response = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get message');
  }
  
  return response.json();
}

// Parse email headers
export function parseHeaders(headers) {
  const result = {};
  
  for (const header of headers || []) {
    result[header.name.toLowerCase()] = header.value;
  }
  
  return result;
}

// Decode base64url encoded content
export function decodeBase64Url(data) {
  if (!data) return '';
  
  const pad = '='.repeat((4 - (data.length % 4)) % 4);
  const base64 = (data + pad).replace(/-/g, '+').replace(/_/g, '/');
  
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

// Extract body from message parts
export function extractBody(payload) {
  let textBody = '';
  let htmlBody = '';
  
  function processPart(part) {
    if (part.body?.data) {
      const content = decodeBase64Url(part.body.data);
      
      if (part.mimeType === 'text/plain') {
        textBody = content;
      } else if (part.mimeType === 'text/html') {
        htmlBody = content;
      }
    }
    
    if (part.parts) {
      part.parts.forEach(processPart);
    }
  }
  
  processPart(payload);
  
  return { textBody, htmlBody };
}

// Parse sender from header
export function parseSender(from) {
  if (!from) return { name: '', email: '' };
  
  const match = from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  
  return {
    name: match?.[1] || match?.[2] || from,
    email: match?.[2] || from,
  };
}

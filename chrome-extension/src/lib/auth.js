/**
 * Arlo Authentication Library for Chrome Extension
 * 
 * Mirrors the main app's auth flow but uses chrome.storage.session
 * for secure token storage.
 */

const AUTH_ENDPOINT = 'https://raspberrypi.tailf531bd.ts.net/auth/verify';
const SUPABASE_URL = 'https://zovhwryzsujevrnakfcw.supabase.co';
const REFRESH_BUFFER_MS = 15 * 1000;
const AUTH_TIMEOUT_MS = 10 * 1000;

// Decode JWT payload
function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const pad = '='.repeat((4 - (parts[1].length % 4)) % 4);
    const base64 = (parts[1] + pad).replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Get user key from JWT
function deriveUserKeyFromJwt(token) {
  const payload = decodeJwtPayload(token);
  const sub = payload?.sub;
  return typeof sub === 'string' && sub.length > 0 ? sub : null;
}

// Check if token is valid
function isTokenValid(cachedToken) {
  if (!cachedToken) return false;
  const now = Date.now();
  const expiresIn = cachedToken.expiresAt - now;
  return expiresIn > REFRESH_BUFFER_MS;
}

// Fetch with timeout
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Get cached token from storage
export async function getCachedToken() {
  const result = await chrome.storage.session.get(['arloToken']);
  return result.arloToken || null;
}

// Save token to storage
export async function setCachedToken(tokenData) {
  await chrome.storage.session.set({ arloToken: tokenData });
}

// Clear token from storage
export async function clearCachedToken() {
  await chrome.storage.session.remove(['arloToken']);
}

// Fetch new token from auth server
async function fetchNewToken() {
  try {
    const response = await fetchWithTimeout(
      AUTH_ENDPOINT,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      AUTH_TIMEOUT_MS
    );

    if (!response.ok) {
      console.error('[arloAuth] Auth endpoint returned:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.token || !data.expiresAt) {
      console.error('[arloAuth] Invalid response from auth endpoint');
      return null;
    }

    const expiresAt = new Date(data.expiresAt).getTime();
    const userKey = deriveUserKeyFromJwt(data.token) ?? data.identity?.user ?? null;

    return {
      token: data.token,
      expiresAt,
      identity: {
        ...data.identity,
        user: userKey ?? undefined,
      },
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[arloAuth] Auth request timed out');
    } else {
      console.error('[arloAuth] Failed to fetch token:', error);
    }
    return null;
  }
}

// Get valid Arlo token
export async function getArloToken() {
  const cachedToken = await getCachedToken();
  
  if (isTokenValid(cachedToken)) {
    return cachedToken.token;
  }

  const newToken = await fetchNewToken();
  
  if (newToken) {
    await setCachedToken(newToken);
    return newToken.token;
  } else {
    await clearCachedToken();
    return null;
  }
}

// Check if authenticated
export async function isAuthenticated() {
  const cachedToken = await getCachedToken();
  return isTokenValid(cachedToken);
}

// Get current identity
export async function getIdentity() {
  const cachedToken = await getCachedToken();
  if (!cachedToken) return null;
  return cachedToken.identity;
}

// Get user key
export async function getUserKey() {
  const identity = await getIdentity();
  return identity?.user ?? null;
}

// Logout
export async function logout() {
  await clearCachedToken();
  await chrome.storage.session.remove(['gmailToken']);
}

// Get auth headers for API calls
export async function getAuthHeaders() {
  const token = await getArloToken();
  if (!token) return null;
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Verify authentication
export async function verifyArloAuth() {
  const token = await getArloToken();
  return token !== null;
}

// Export constants
export { SUPABASE_URL };

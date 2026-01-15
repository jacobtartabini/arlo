/**
 * Arlo Authentication Module
 * 
 * Handles JWT-based authentication with the Raspberry Pi auth server.
 * Token is cached in memory only (no localStorage/sessionStorage).
 * 
 * In Lovable preview environments (*.lovableproject.com, lovable.dev),
 * provides development-mode authentication when the Tailscale auth server
 * is unreachable.
 * 
 * On public booking domains (e.g., meet.jacobtartabini.com), authentication
 * is completely disabled to avoid CORS errors.
 */

import { isPublicBookingDomain } from '@/lib/domain-utils';

const AUTH_ENDPOINT = 'https://raspberrypi.tailf531bd.ts.net/auth/verify';

// Buffer time before expiry to trigger refresh (15 seconds)
const REFRESH_BUFFER_MS = 15 * 1000;

// Network timeout for auth requests (10 seconds for prod, 3 seconds for dev fallback)
const AUTH_TIMEOUT_MS = 10 * 1000;
const DEV_AUTH_TIMEOUT_MS = 3 * 1000;

// Development user key for Lovable preview environments
const DEV_USER_KEY = 'dev@lovable.preview';

/**
 * Check if running in a Lovable preview environment
 */
function isLovablePreview(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host.endsWith('.lovableproject.com') ||
    host.includes('lovable.dev') ||
    host === 'localhost'
  );
}

/**
 * Create a development-mode token for Lovable preview
 */
function createDevToken(): CachedToken {
  // Token expires in 24 hours
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  
  // Create a simple JWT-like structure (not cryptographically signed, dev only)
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: DEV_USER_KEY,
    iss: 'lovable-dev',
    exp: Math.floor(expiresAt / 1000),
    iat: Math.floor(Date.now() / 1000),
  }));
  const token = `${header}.${payload}.dev`;

  console.log('[arloAuth] Using development mode authentication (Lovable preview)');

  return {
    token,
    expiresAt,
    identity: {
      user: DEV_USER_KEY,
      node: 'lovable-preview',
      tailnet: 'dev.lovable.ts.net',
    },
  };
}

function base64UrlToString(input: string): string {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');

  // atob() returns a binary string. This keeps Unicode safe when present.
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

function decodeJwtPayload<T = unknown>(token: string): T | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const json = base64UrlToString(parts[1]);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function deriveUserKeyFromJwt(token: string): string | null {
  const payload = decodeJwtPayload<{ sub?: unknown }>(token);
  const sub = payload?.sub;
  return typeof sub === 'string' && sub.length > 0 ? sub : null;
}

interface ArloAuthResponse {
  status: string;
  token: string;
  expiresAt: string; // ISO timestamp
  identity: {
    user?: string;
    node?: string;
    tailnet?: string;
  };
}

interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp in ms
  identity: ArloAuthResponse['identity'];
}

// In-memory token cache (NOT persisted)
let cachedToken: CachedToken | null = null;

// Promise to prevent concurrent refresh attempts
let refreshPromise: Promise<string | null> | null = null;

/**
 * Check if the cached token is valid and not expiring soon
 */
function isTokenValid(): boolean {
  if (!cachedToken) return false;
  
  const now = Date.now();
  const expiresIn = cachedToken.expiresAt - now;
  
  // Token is valid if it has more than REFRESH_BUFFER_MS left
  return expiresIn > REFRESH_BUFFER_MS;
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
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

/**
 * Fetch a new token from the auth server
 * Falls back to dev mode in Lovable preview environments
 */
async function fetchNewToken(): Promise<CachedToken | null> {
  const inLovablePreview = isLovablePreview();
  
  try {
    const response = await fetchWithTimeout(
      AUTH_ENDPOINT,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      inLovablePreview ? DEV_AUTH_TIMEOUT_MS : AUTH_TIMEOUT_MS
    );

    if (!response.ok) {
      console.error('[arloAuth] Auth endpoint returned:', response.status);
      // Fall back to dev mode in Lovable preview
      if (inLovablePreview) {
        return createDevToken();
      }
      return null;
    }

    const data: ArloAuthResponse = await response.json();
    
    if (!data.token || !data.expiresAt) {
      console.error('[arloAuth] Invalid response from auth endpoint:', data);
      if (inLovablePreview) {
        return createDevToken();
      }
      return null;
    }

    const expiresAt = new Date(data.expiresAt).getTime();

    // Single source of truth: user_key comes from JWT `sub`
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
    // In Lovable preview environments, fall back to dev mode on network errors
    if (inLovablePreview) {
      if (import.meta.env.DEV) {
        console.log('[arloAuth] Tailscale auth unreachable, using dev mode');
      }
      return createDevToken();
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[arloAuth] Auth request timed out');
    } else {
      console.error('[arloAuth] Failed to fetch token:', error);
    }
    return null;
  }
}

/**
 * Get a valid Arlo token, refreshing if necessary.
 * Returns null if authentication fails.
 */
export async function getArloToken(): Promise<string | null> {
  // On public booking domains, don't attempt authentication at all
  if (isPublicBookingDomain()) {
    return null;
  }

  // Return cached token if still valid
  if (isTokenValid() && cachedToken) {
    return cachedToken.token;
  }

  // If already refreshing, wait for that promise
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start refresh
  refreshPromise = (async () => {
    try {
      const newToken = await fetchNewToken();
      
      if (newToken) {
        cachedToken = newToken;
        return newToken.token;
      } else {
        // Clear cache on failure
        cachedToken = null;
        return null;
      }
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Check if we currently have a valid token (synchronous check)
 */
export function isAuthenticated(): boolean {
  return isTokenValid();
}

/**
 * Get the current identity info if authenticated
 */
export function getIdentity(): ArloAuthResponse['identity'] | null {
  if (!cachedToken) return null;

  // Backfill userKey from JWT if the verify endpoint didn't include it
  if (!cachedToken.identity?.user) {
    const derived = deriveUserKeyFromJwt(cachedToken.token);
    if (derived) {
      return { ...cachedToken.identity, user: derived };
    }
  }

  return cachedToken.identity;
}

/** Canonical user identifier used across the app (maps to DB `user_key`). */
export function getUserKey(): string | null {
  return getIdentity()?.user ?? null;
}

/**
 * Clear the cached token (logout)
 */
export function clearArloToken(): void {
  cachedToken = null;
}

/**
 * Get token expiry time in ms from now (or 0 if no token)
 */
export function getTokenExpiresIn(): number {
  if (!cachedToken) return 0;
  return Math.max(0, cachedToken.expiresAt - Date.now());
}

/**
 * Verify authentication by attempting to get a token.
 * This is the main entry point for protected pages.
 */
export async function verifyArloAuth(): Promise<boolean> {
  const token = await getArloToken();
  return token !== null;
}

/**
 * Create headers for authenticated API calls.
 * NOTE: Do NOT include Content-Type when using supabase.functions.invoke()
 * as it handles JSON serialization automatically. Including Content-Type
 * bypasses automatic stringification and causes "[object Object]" errors.
 */
export async function getAuthHeaders(): Promise<HeadersInit | null> {
  const token = await getArloToken();
  
  if (!token) return null;
  
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Create headers for raw fetch() calls (includes Content-Type)
 */
export async function getAuthHeadersWithContentType(): Promise<HeadersInit | null> {
  const token = await getArloToken();
  
  if (!token) return null;
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

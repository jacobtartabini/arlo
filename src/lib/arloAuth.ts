/**
 * Arlo Authentication Module
 * 
 * Handles JWT-based authentication with the Raspberry Pi auth server.
 * Token is cached in memory only (no localStorage/sessionStorage).
 */

const AUTH_ENDPOINT = 'https://raspberrypi.tailf531bd.ts.net/auth/verify';

// Buffer time before expiry to trigger refresh (15 seconds)
const REFRESH_BUFFER_MS = 15 * 1000;

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
 * Fetch a new token from the auth server
 */
async function fetchNewToken(): Promise<CachedToken | null> {
  try {
    const response = await fetch(AUTH_ENDPOINT, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('[arloAuth] Auth endpoint returned:', response.status);
      return null;
    }

    const data: ArloAuthResponse = await response.json();
    
    if (!data.token || !data.expiresAt) {
      console.error('[arloAuth] Invalid response from auth endpoint:', data);
      return null;
    }

    const expiresAt = new Date(data.expiresAt).getTime();
    
    return {
      token: data.token,
      expiresAt,
      identity: data.identity,
    };
  } catch (error) {
    console.error('[arloAuth] Failed to fetch token:', error);
    return null;
  }
}

/**
 * Get a valid Arlo token, refreshing if necessary.
 * Returns null if authentication fails.
 */
export async function getArloToken(): Promise<string | null> {
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
  return cachedToken.identity;
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
 * Create headers for authenticated API calls
 */
export async function getAuthHeaders(): Promise<HeadersInit | null> {
  const token = await getArloToken();
  
  if (!token) return null;
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

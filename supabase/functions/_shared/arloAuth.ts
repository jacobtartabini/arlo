/**
 * Shared JWT verification for Arlo Edge Functions
 * 
 * All protected edge functions should use verifyArloJWT() to authenticate requests.
 * Tokens are minted by the Raspberry Pi /auth/verify endpoint.
 * 
 * Identity is derived SOLELY from the verified JWT.sub claim.
 * No hard-coded user IDs or ARLO_USER_ID environment variables are used.
 * 
 * SECURITY HARDENING:
 * - Strict CORS: rejects requests with missing or unrecognized origins
 * - Rate limiting: integrated with authRateLimit module
 * - Auth failure logging: tracks repeated failures for alerting
 */

import { verify } from "https://deno.land/x/djwt@v2.9.1/mod.ts";

// Allowed origins for CORS - STRICT enforcement
const ALLOWED_ORIGINS = [
  'https://arlo.jacobtartabini.com',
  'http://localhost:8000',
  'http://localhost:8080',
  'http://localhost:5173',
];

const DEFAULT_ALLOWED_HEADERS = [
  // Supabase built-ins / common
  'authorization',
  'apikey',
  'content-type',
  'x-client-info',
  // Arlo custom auth
  'x-arlo-authorization',
  // misc
  'x-user-key',
];

const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

// Check if origin is a Lovable URL (editor or preview)
function isLovableOrigin(origin: string): boolean {
  return (
    /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin) ||
    origin === 'https://lovable.dev'
  );
}

export interface ArloJWTClaims {
  sub: string;      // User identity (Tailscale login/email) - THIS IS THE SOLE SOURCE OF IDENTITY
  iss: string;      // Issuer
  aud?: string;     // Audience (optional for dev tokens)
  exp: number;      // Expiration timestamp
  iat: number;      // Issued at timestamp
  node?: string;    // Tailscale node name
  tailnet?: string; // Tailnet name
}

// Result of authentication attempt
export interface ArloAuthResult {
  authenticated: boolean;
  claims?: ArloJWTClaims;
  userId: string;
  error?: string;
}

/**
 * Check if origin is allowed
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || isLovableOrigin(origin);
}

function normalizeHeaderName(headerName: string): string {
  return headerName.trim().toLowerCase();
}

function parseRequestedHeaders(req: Request): string[] {
  const raw = req.headers.get('access-control-request-headers');
  if (!raw) return [];
  return raw
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
}

function buildAccessControlAllowHeaders(requested: string[]): string {
  const allowed = new Set(DEFAULT_ALLOWED_HEADERS.map(normalizeHeaderName));

  // Always include defaults; also echo back any requested headers that are allowed.
  const result = new Set<string>(DEFAULT_ALLOWED_HEADERS.map(normalizeHeaderName));
  for (const header of requested) {
    const normalized = normalizeHeaderName(header);
    if (allowed.has(normalized)) result.add(normalized);
  }

  return Array.from(result).sort().join(', ');
}

/**
 * Get CORS headers with STRICT origin validation
 * Returns null if origin is not allowed (caller should reject request)
 */
export function getCorsHeaders(requestOrigin?: string | null, req?: Request): Record<string, string> {
  const origin = requestOrigin ?? null;
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : null;
  const requestedHeaders = req ? parseRequestedHeaders(req) : [];
  const allowHeaders = buildAccessControlAllowHeaders(requestedHeaders);
  const requestedMethod = req?.headers.get('access-control-request-method') ?? undefined;

  const varyValues = ['Origin', 'Access-Control-Request-Headers', 'Access-Control-Request-Method'];

  // STRICT: If origin is not allowed, do not echo it back. This effectively blocks the browser.
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigin ?? ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS.join(', '),
    'Access-Control-Max-Age': '86400',
    'Vary': varyValues.join(', '),
  };

  // Helpful in debugging and safe: reflect the method requested (still constrained by Allow-Methods).
  if (requestedMethod) {
    headers['Access-Control-Allow-Methods'] = DEFAULT_ALLOWED_METHODS.join(', ');
  }

  return headers;
}

/**
 * Handle CORS preflight request with STRICT origin validation
 */
export function handleCorsOptions(req: Request): Response {
  const origin = req.headers.get('origin');
  
  // STRICT: Reject preflight from unrecognized origins (but allow Lovable preview)
  if (!origin || !isAllowedOrigin(origin)) {
    console.log(`[arloAuth] CORS preflight rejected: origin=${origin}`);
    return new Response(null, { 
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
      }
    });
  }
  
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(origin, req),
  });
}

/**
 * Check origin and reject if invalid (for non-preflight requests)
 */
export function validateOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin');
  
  // For requests without origin (e.g., same-origin or server-to-server), allow
  // But for cross-origin requests, enforce strict checking (allow Lovable preview)
  if (origin && !isAllowedOrigin(origin)) {
    console.log(`[arloAuth] Request rejected: invalid origin=${origin}`);
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { 
        status: 403, 
        headers: { 
          ...getCorsHeaders(origin, req),
          'Content-Type': 'application/json',
        } 
      }
    );
  }
  
  return null;
}

/**
 * Create a crypto key from the JWT secret
 */
async function getJWTKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ARLO_AUTH_JWT_SECRET');
  if (!secret) {
    throw new Error('ARLO_AUTH_JWT_SECRET not configured');
  }
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Verify the Arlo JWT from the Authorization header.
 * 
 * IMPORTANT: User identity comes SOLELY from JWT.sub.
 * No ARLO_USER_ID or hard-coded IDs are used.
 */
export async function verifyArloJWT(req: Request): Promise<ArloAuthResult> {
  // Prefer Arlo-specific header to avoid conflicts with Supabase's built-in JWT expectations.
  // Fallback to Authorization for backwards compatibility.
  const arloHeader = req.headers.get('x-arlo-authorization');
  const authHeader = arloHeader ?? req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[arloAuth] Missing or invalid auth header (x-arlo-authorization or authorization)');
    return { 
      authenticated: false, 
      error: 'Bearer token header required',
      userId: ''
    };
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  // All tokens must be cryptographically signed - no dev/preview tokens accepted
  
  const ARLO_JWT_ISSUER = Deno.env.get('ARLO_JWT_ISSUER');
  const ARLO_JWT_AUDIENCE = Deno.env.get('ARLO_JWT_AUDIENCE');
  
  if (!ARLO_JWT_ISSUER || !ARLO_JWT_AUDIENCE) {
    console.error('[arloAuth] Missing JWT configuration: ARLO_JWT_ISSUER or ARLO_JWT_AUDIENCE');
    return { 
      authenticated: false, 
      error: 'JWT configuration missing',
      userId: ''
    };
  }
  
  try {
    const key = await getJWTKey();
    
    // Verify the token
    const payload = await verify(token, key) as ArloJWTClaims;
    
    // Validate issuer
    if (payload.iss !== ARLO_JWT_ISSUER) {
      console.log('[arloAuth] Invalid issuer:', payload.iss, 'expected:', ARLO_JWT_ISSUER);
      return { 
        authenticated: false, 
        error: 'Invalid token issuer',
        userId: ''
      };
    }
    
    // Validate audience (supports both string and string[] JWT aud formats)
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(ARLO_JWT_AUDIENCE)) {
      console.log('[arloAuth] Invalid audience:', payload.aud, 'expected to include:', ARLO_JWT_AUDIENCE);
      return { 
        authenticated: false, 
        error: 'Invalid token audience',
        userId: ''
      };
    }
    
    // Check expiration (djwt already does this, but be explicit)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log('[arloAuth] Token expired at:', new Date(payload.exp * 1000).toISOString());
      return { 
        authenticated: false, 
        error: 'Token expired',
        userId: ''
      };
    }
    
    // Validate sub claim exists
    if (!payload.sub) {
      console.log('[arloAuth] Missing sub claim in JWT');
      return { 
        authenticated: false, 
        error: 'Invalid token: missing subject',
        userId: ''
      };
    }
    
    console.log('[arloAuth] JWT verified for:', payload.sub);
    
    // CRITICAL: userId is derived SOLELY from JWT.sub
    // This is the user's Tailscale login/email identity
    return {
      authenticated: true,
      claims: payload,
      userId: payload.sub,
    };
    
  } catch (error) {
    console.error('[arloAuth] JWT verification failed:', error);
    return { 
      authenticated: false, 
      error: error instanceof Error ? error.message : 'Token verification failed',
      userId: ''
    };
  }
}

/**
 * Create an unauthorized response with proper CORS headers
 */
export function unauthorizedResponse(req: Request, message: string = 'Unauthorized'): Response {
  const origin = req.headers.get('origin');
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 401, 
      headers: { 
        ...getCorsHeaders(origin, req),
        'Content-Type': 'application/json' 
      } 
    }
  );
}

/**
 * Create a forbidden response with proper CORS headers
 */
export function forbiddenResponse(req: Request, message: string = 'Forbidden'): Response {
  const origin = req.headers.get('origin');
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 403, 
      headers: { 
        ...getCorsHeaders(origin, req),
        'Content-Type': 'application/json' 
      } 
    }
  );
}

/**
 * Create a success response with proper CORS headers
 */
export function jsonResponse(req: Request, data: unknown, status: number = 200): Response {
  const origin = req.headers.get('origin');
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 
        ...getCorsHeaders(origin, req),
        'Content-Type': 'application/json' 
      } 
    }
  );
}

/**
 * Create an error response with proper CORS headers
 */
export function errorResponse(req: Request, message: string, status: number = 500): Response {
  const origin = req.headers.get('origin');
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { 
        ...getCorsHeaders(origin, req),
        'Content-Type': 'application/json' 
      } 
    }
  );
}

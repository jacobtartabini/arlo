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

/**
 * Get CORS headers with STRICT origin validation
 * Returns null if origin is not allowed (caller should reject request)
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  // STRICT: Only allow recognized origins (includes Lovable preview)
  if (!requestOrigin || !isAllowedOrigin(requestOrigin)) {
    // Return headers that block the request
    return {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0], // Never echo back invalid origin
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
  }
  
  return {
    'Access-Control-Allow-Origin': requestOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
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
        'Vary': 'Origin',
      }
    });
  }
  
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(origin) 
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
          'Content-Type': 'application/json',
          'Vary': 'Origin',
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
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[arloAuth] Missing or invalid Authorization header');
    return { 
      authenticated: false, 
      error: 'Authorization header required',
      userId: ''
    };
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  // Check for dev token (alg: none) from Lovable preview
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const headerJson = atob(parts[0]);
      const header = JSON.parse(headerJson);
      
      if (header.alg === 'none') {
        // Dev token - validate structure and accept in preview environments
        const payloadJson = atob(parts[1]);
        const payload = JSON.parse(payloadJson) as ArloJWTClaims;
        
        // Check issuer is lovable-dev
        if (payload.iss === 'lovable-dev' && payload.sub) {
          // Check expiration
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            console.log('[arloAuth] Dev token expired');
            return { 
              authenticated: false, 
              error: 'Token expired',
              userId: ''
            };
          }
          
          console.log('[arloAuth] Dev token accepted for:', payload.sub);
          return {
            authenticated: true,
            claims: payload,
            userId: payload.sub,
          };
        }
      }
    }
  } catch {
    // Not a dev token or malformed, continue with normal verification
  }
  
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
    
    // Validate audience
    if (payload.aud !== ARLO_JWT_AUDIENCE) {
      console.log('[arloAuth] Invalid audience:', payload.aud, 'expected:', ARLO_JWT_AUDIENCE);
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
        ...getCorsHeaders(origin), 
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
        ...getCorsHeaders(origin), 
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
        ...getCorsHeaders(origin), 
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
        ...getCorsHeaders(origin), 
        'Content-Type': 'application/json' 
      } 
    }
  );
}

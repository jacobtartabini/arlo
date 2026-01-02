/**
 * Shared JWT verification for Arlo Edge Functions
 * 
 * All protected edge functions should use verifyArloJWT() to authenticate requests.
 * Tokens are minted by the Raspberry Pi /auth/verify endpoint.
 */

import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://arlo.jacobtartabini.com',
  'http://localhost:8000',
  'http://localhost:8080',
  'http://localhost:5173',
];

export interface ArloJWTClaims {
  sub: string;      // Tailscale login (email)
  iss: string;      // Issuer
  aud: string;      // Audience
  exp: number;      // Expiration timestamp
  iat: number;      // Issued at timestamp
  node?: string;    // Tailscale node name
  tailnet?: string; // Tailnet name
}

export interface ArloAuthResult {
  authenticated: boolean;
  claims?: ArloJWTClaims;
  error?: string;
  userId: string;
}

/**
 * Get CORS headers with proper origin validation
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsOptions(req: Request): Response {
  const origin = req.headers.get('origin');
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(origin) 
  });
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
 * Verify the Arlo JWT from the Authorization header
 */
export async function verifyArloJWT(req: Request): Promise<ArloAuthResult> {
  const ARLO_JWT_ISSUER = Deno.env.get('ARLO_JWT_ISSUER');
  const ARLO_JWT_AUDIENCE = Deno.env.get('ARLO_JWT_AUDIENCE');
  const ARLO_USER_ID = Deno.env.get('ARLO_USER_ID');
  
  if (!ARLO_JWT_ISSUER || !ARLO_JWT_AUDIENCE || !ARLO_USER_ID) {
    console.error('[arloAuth] Missing JWT configuration environment variables');
    return { 
      authenticated: false, 
      error: 'JWT configuration missing',
      userId: ''
    };
  }

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
    
    console.log('[arloAuth] JWT verified for:', payload.sub);
    
    return {
      authenticated: true,
      claims: payload,
      userId: ARLO_USER_ID,
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

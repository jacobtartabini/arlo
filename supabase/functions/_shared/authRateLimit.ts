/**
 * Rate Limiting for Authentication and OAuth Endpoints
 * 
 * Provides specialized rate limiting with logging and alerting for auth abuse.
 */

import { checkRateLimit, getClientIP, rateLimitResponse, RateLimitConfig } from './rateLimit.ts';
import { getCorsHeaders } from './arloAuth.ts';

// In-memory store for tracking auth failures
const authFailureStore = new Map<string, { count: number; firstFailure: number }>();
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const ALERT_THRESHOLD = 10; // Alert after 10 failures

/**
 * Rate limit configurations for authentication endpoints
 */
export const AUTH_RATE_LIMITS = {
  /** OAuth authorization URL requests: 5 per minute */
  oauthAuthUrl: {
    maxRequests: 5,
    windowSeconds: 60,
    keyPrefix: 'oauth_auth',
  } as RateLimitConfig,
  
  /** OAuth code exchange: 3 per minute (should only happen once per flow) */
  oauthExchange: {
    maxRequests: 3,
    windowSeconds: 60,
    keyPrefix: 'oauth_exchange',
  } as RateLimitConfig,
  
  /** JWT verification attempts: 30 per minute */
  jwtVerify: {
    maxRequests: 30,
    windowSeconds: 60,
    keyPrefix: 'jwt_verify',
  } as RateLimitConfig,
  
  /** Calendar sync requests: 10 per minute */
  calendarSync: {
    maxRequests: 10,
    windowSeconds: 60,
    keyPrefix: 'cal_sync',
  } as RateLimitConfig,
  
  /** Data API requests: 60 per minute */
  dataApi: {
    maxRequests: 60,
    windowSeconds: 60,
    keyPrefix: 'data_api',
  } as RateLimitConfig,
};

/**
 * Check rate limit and return response if limited
 */
export function checkAuthRateLimit(
  req: Request, 
  config: RateLimitConfig
): Response | null {
  const clientIP = getClientIP(req);
  const result = checkRateLimit(clientIP, config);
  
  if (!result.allowed) {
    console.log(`[authRateLimit] Rate limited: ${config.keyPrefix} from ${clientIP}`);
    const origin = req.headers.get('origin');
    return rateLimitResponse(result, getCorsHeaders(origin));
  }
  
  return null;
}

/**
 * Log an authentication failure for abuse detection
 */
export function logAuthFailure(req: Request, reason: string): void {
  const clientIP = getClientIP(req);
  const now = Date.now();
  
  const existing = authFailureStore.get(clientIP);
  
  if (!existing || (now - existing.firstFailure) > FAILURE_WINDOW_MS) {
    // Start new tracking window
    authFailureStore.set(clientIP, { count: 1, firstFailure: now });
  } else {
    // Increment failure count
    existing.count += 1;
    authFailureStore.set(clientIP, existing);
    
    // Check if we should alert
    if (existing.count === ALERT_THRESHOLD) {
      console.error(`[SECURITY ALERT] Multiple auth failures from ${clientIP}: ${existing.count} failures in ${FAILURE_WINDOW_MS / 60000} minutes. Latest reason: ${reason}`);
    } else if (existing.count > ALERT_THRESHOLD && existing.count % 10 === 0) {
      console.error(`[SECURITY ALERT] Continued auth failures from ${clientIP}: ${existing.count} total failures`);
    }
  }
  
  console.log(`[authFailure] IP: ${clientIP}, Reason: ${reason}`);
}

/**
 * Log an OAuth-related security event
 */
export function logOAuthEvent(
  event: 'nonce_invalid' | 'state_invalid' | 'code_exchange_failed' | 'token_refresh_failed',
  req: Request,
  details?: Record<string, unknown>
): void {
  const clientIP = getClientIP(req);
  const timestamp = new Date().toISOString();
  
  console.log(`[oauthSecurity] Event: ${event}, IP: ${clientIP}, Time: ${timestamp}`, details || '');
  
  // Log as failure for tracking
  logAuthFailure(req, `OAuth: ${event}`);
}

/**
 * Clean up old failure tracking entries
 */
export function cleanupFailureTracking(): void {
  const now = Date.now();
  
  for (const [ip, data] of authFailureStore.entries()) {
    if (now - data.firstFailure > FAILURE_WINDOW_MS) {
      authFailureStore.delete(ip);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupFailureTracking, 5 * 60 * 1000);

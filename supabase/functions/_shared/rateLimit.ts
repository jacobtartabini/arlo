/**
 * Rate Limiting and Bot Protection for Edge Functions
 * 
 * Provides IP-based rate limiting using in-memory storage.
 * Note: In production with multiple Deno isolates, consider using Redis/KV store.
 */

// In-memory rate limit store (per isolate)
// Format: { [key: string]: { count: number, resetAt: number } }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Prefix for rate limit key (e.g., 'booking', 'availability') */
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries();
  
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetAt) {
    // New window or expired
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }
  
  if (existing.count >= config.maxRequests) {
    // Rate limited
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds,
    };
  }
  
  // Increment count
  existing.count += 1;
  rateLimitStore.set(key, existing);
  
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Get client IP from request headers
 * Handles common proxy headers
 */
export function getClientIP(req: Request): string {
  // Try various headers in order of preference
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // Fallback - in edge functions, might not have direct access to socket
  return 'unknown';
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfterSeconds: result.retryAfterSeconds,
      code: 'RATE_LIMITED',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds || 60),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
        ...corsHeaders,
      },
    }
  );
}

// Pre-configured rate limits for booking endpoints
export const RATE_LIMITS = {
  /** Availability queries: 20 per minute per IP */
  availability: {
    maxRequests: 20,
    windowSeconds: 60,
    keyPrefix: 'avail',
  } as RateLimitConfig,
  
  /** Booking creation: 5 per hour per IP */
  createBooking: {
    maxRequests: 5,
    windowSeconds: 3600,
    keyPrefix: 'book',
  } as RateLimitConfig,
  
  /** Manage booking: 10 per hour per IP */
  manageBooking: {
    maxRequests: 10,
    windowSeconds: 3600,
    keyPrefix: 'manage',
  } as RateLimitConfig,
  
  /** Per-email limits for booking: 3 per day */
  bookingPerEmail: {
    maxRequests: 3,
    windowSeconds: 86400, // 24 hours
    keyPrefix: 'book_email',
  } as RateLimitConfig,
};

/**
 * Check honeypot fields for bot detection
 * Returns true if request appears to be from a bot
 */
export function isHoneypotTriggered(data: Record<string, unknown>): boolean {
  // Common honeypot field names that should be empty
  const honeypotFields = ['website', 'company', 'url', 'phone2', 'fax'];
  
  for (const field of honeypotFields) {
    if (data[field] && String(data[field]).trim().length > 0) {
      console.log(`[bot-detection] Honeypot triggered: ${field}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Check for suspicious request patterns
 */
export function isSuspiciousRequest(req: Request, data: Record<string, unknown>): boolean {
  // Check for missing or suspicious user agent
  const userAgent = req.headers.get('user-agent') || '';
  
  // Obvious bot user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python-requests/i,
    /^$/  // Empty user agent
  ];
  
  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      console.log(`[bot-detection] Suspicious user agent: ${userAgent}`);
      return true;
    }
  }
  
  // Check for unusually fast form submission (less than 2 seconds)
  // This requires the client to send a timestamp
  const submissionTime = data._formLoadedAt as number | undefined;
  if (submissionTime) {
    const elapsed = Date.now() - submissionTime;
    if (elapsed < 2000) {
      console.log(`[bot-detection] Form submitted too quickly: ${elapsed}ms`);
      return true;
    }
  }
  
  return false;
}

/**
 * Generate a secure, unguessable booking token
 * Used instead of predictable event IDs for manage-booking URLs
 */
export async function generateSecureToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash an identifier for logging (privacy protection)
 */
export function hashForLogging(value: string): string {
  if (!value) return 'unknown';
  if (value.length <= 6) return '***';
  return value.substring(0, 3) + '***' + value.substring(value.length - 3);
}

/**
 * Shared provider error classifier for integration sync edge functions.
 *
 * Every external integration (Google Calendar, Drive, Gmail, Outlook, Plaid, Strava,
 * Tailscale) ultimately fails for the same handful of reasons. This module
 * classifies those failures into a small, stable enum so:
 *   1. The frontend can render a single "Reconnect" badge when auth has expired.
 *   2. We never crash the UI when an upstream provider is briefly unavailable.
 *   3. Each integration row records a structured `last_sync_error` instead of an
 *      opaque stack trace.
 */

export type ProviderErrorReason =
  | 'auth_expired'      // OAuth token refresh failed → user must reconnect
  | 'auth_invalid'      // Token decryption / malformed credentials
  | 'rate_limited'      // 429 from upstream
  | 'upstream_5xx'      // 500/502/503/504 — transient
  | 'upstream_4xx'      // 400/403/404 — likely misconfiguration
  | 'network'           // fetch threw, DNS, TLS
  | 'unknown';

export interface ClassifiedError {
  reason: ProviderErrorReason;
  message: string;
  /** Whether the user can resolve this by reconnecting the integration. */
  reconnectRequired: boolean;
  /** HTTP status to forward to the frontend. Always 200 so the UI keeps rendering. */
  status: 200;
  /** Original status code from upstream, if any. */
  upstreamStatus?: number;
}

/**
 * Classify an HTTP response from an upstream OAuth provider.
 */
export function classifyUpstreamResponse(
  response: Response,
  body?: unknown
): ClassifiedError {
  const status = response.status;
  const bodyText =
    typeof body === 'string'
      ? body
      : body
      ? JSON.stringify(body).slice(0, 500)
      : '';

  if (status === 401) {
    return {
      reason: 'auth_expired',
      message: 'Authentication expired. Please reconnect this account.',
      reconnectRequired: true,
      status: 200,
      upstreamStatus: status,
    };
  }

  if (status === 403) {
    // Distinguish "scopes missing" from "rate limit" — both can come back as 403 from Google.
    const looksLikeQuota = /quota|rate|limit/i.test(bodyText);
    if (looksLikeQuota) {
      return {
        reason: 'rate_limited',
        message: 'Provider rate limit reached. Will retry shortly.',
        reconnectRequired: false,
        status: 200,
        upstreamStatus: status,
      };
    }
    return {
      reason: 'auth_expired',
      message: 'Permission denied. Reconnect to refresh granted scopes.',
      reconnectRequired: true,
      status: 200,
      upstreamStatus: status,
    };
  }

  if (status === 429) {
    return {
      reason: 'rate_limited',
      message: 'Provider rate limit reached. Will retry shortly.',
      reconnectRequired: false,
      status: 200,
      upstreamStatus: status,
    };
  }

  if (status >= 500) {
    return {
      reason: 'upstream_5xx',
      message: 'Provider is temporarily unavailable. Will retry on next sync.',
      reconnectRequired: false,
      status: 200,
      upstreamStatus: status,
    };
  }

  if (status >= 400) {
    return {
      reason: 'upstream_4xx',
      message: `Provider rejected the request (${status}). Check integration settings.`,
      reconnectRequired: false,
      status: 200,
      upstreamStatus: status,
    };
  }

  return {
    reason: 'unknown',
    message: `Unexpected provider response (${status}).`,
    reconnectRequired: false,
    status: 200,
    upstreamStatus: status,
  };
}

/**
 * Classify a thrown exception (fetch failure, decrypt failure, etc).
 */
export function classifyException(err: unknown): ClassifiedError {
  const message = err instanceof Error ? err.message : String(err);

  if (/decrypt|encryption|invalid token/i.test(message)) {
    return {
      reason: 'auth_invalid',
      message: 'Stored credentials could not be read. Please reconnect this account.',
      reconnectRequired: true,
      status: 200,
    };
  }

  if (/fetch|network|ENOTFOUND|ECONN|TLS|certificate/i.test(message)) {
    return {
      reason: 'network',
      message: 'Network error reaching provider. Will retry on next sync.',
      reconnectRequired: false,
      status: 200,
    };
  }

  return {
    reason: 'unknown',
    message: message.slice(0, 200),
    reconnectRequired: false,
    status: 200,
  };
}

/**
 * Build a structured payload to write into `last_sync_error` columns.
 * Stored as JSON so the UI can render `reason`, `message`, and `reconnectRequired`.
 */
export function buildSyncErrorPayload(classified: ClassifiedError): string {
  return JSON.stringify({
    reason: classified.reason,
    message: classified.message,
    reconnectRequired: classified.reconnectRequired,
    upstreamStatus: classified.upstreamStatus,
    at: new Date().toISOString(),
  });
}

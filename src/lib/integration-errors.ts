/**
 * Frontend helpers for parsing structured `last_sync_error` payloads written by
 * Supabase edge functions via `_shared/providerErrors.ts`.
 *
 * Old rows may still hold plain strings — those degrade gracefully to a generic
 * error with `reconnectRequired: false`.
 */

export type ProviderErrorReason =
  | 'auth_expired'
  | 'auth_invalid'
  | 'rate_limited'
  | 'upstream_5xx'
  | 'upstream_4xx'
  | 'network'
  | 'unknown';

export interface ParsedSyncError {
  reason: ProviderErrorReason;
  message: string;
  reconnectRequired: boolean;
  upstreamStatus?: number;
  at?: string;
}

export function parseSyncError(raw: string | null | undefined): ParsedSyncError | null {
  if (!raw) return null;

  // Try structured JSON first.
  if (raw.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object' && typeof obj.reason === 'string') {
        return {
          reason: obj.reason as ProviderErrorReason,
          message: typeof obj.message === 'string' ? obj.message : 'Sync failed',
          reconnectRequired: obj.reconnectRequired === true,
          upstreamStatus: typeof obj.upstreamStatus === 'number' ? obj.upstreamStatus : undefined,
          at: typeof obj.at === 'string' ? obj.at : undefined,
        };
      }
    } catch {
      // fall through to string fallback
    }
  }

  // Plain string fallback — try to infer "reconnect required" from common phrasing.
  const lower = raw.toLowerCase();
  const reconnectRequired =
    lower.includes('expired') ||
    lower.includes('reconnect') ||
    lower.includes('unauthorized') ||
    lower.includes('refresh token');

  return {
    reason: reconnectRequired ? 'auth_expired' : 'unknown',
    message: raw.slice(0, 200),
    reconnectRequired,
  };
}

export function isReconnectRequired(raw: string | null | undefined): boolean {
  const parsed = parseSyncError(raw);
  return !!parsed?.reconnectRequired;
}

/**
 * Arlo Authentication Module
 *
 * Arlo is now a client of the standalone Aegis auth service.
 * This module manages JWT storage/validation and centralizes redirect flow.
 */

import { isPublicBookingDomain } from '@/lib/domain-utils';

const DEFAULT_AEGIS_BASE_URL = 'https://raspberrypi.tailf531bd.ts.net';
const DEFAULT_APP_NAME = 'arlo';
const DEFAULT_CALLBACK_PATH = '/auth/callback';
const STORAGE_TOKEN_KEY = 'arlo_auth_token';
const AUTH_BYPASS_PATH_PREFIXES = ['/auth/callback', '/auth/oauth-callback', '/auth/error', '/login', '/book', '/booking'];
const ARLO_AUTH_HEADER = 'X-Arlo-Authorization';
export const ARLO_AUTH_INVALIDATED_EVENT = 'arlo:auth-invalidated';
const AUTH_REDIRECT_ATTEMPTS_KEY = 'arlo_auth_redirect_attempts';
const AUTH_REDIRECT_MAX_ATTEMPTS = 3;
const AUTH_REDIRECT_WINDOW_MS = 60 * 1000;

// Buffer time before expiry to force refresh (15 seconds)
const REFRESH_BUFFER_MS = 15 * 1000;

interface JwtPayload {
  sub?: unknown;
  exp?: unknown;
  iss?: unknown;
  aud?: unknown;
}

interface CachedToken {
  token: string;
  expiresAt: number;
  payload: JwtPayload;
}

interface TokenValidationResult {
  valid: boolean;
  reason?: string;
  payload?: JwtPayload;
  expiresAt?: number;
}

let cachedToken: CachedToken | null = null;

function base64UrlToString(input: string): string {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');

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

function normalizeAudience(aud: unknown): string[] {
  if (typeof aud === 'string') return [aud];
  if (Array.isArray(aud)) return aud.filter((entry): entry is string => typeof entry === 'string');
  return [];
}

function getAegisBaseUrl(): string {
  return (import.meta.env.VITE_AEGIS_BASE_URL || DEFAULT_AEGIS_BASE_URL).replace(/\/$/, '');
}

function getAegisAppName(): string {
  return import.meta.env.VITE_AEGIS_APP_NAME || DEFAULT_APP_NAME;
}

function getCallbackPath(): string {
  return import.meta.env.VITE_AEGIS_CALLBACK_PATH || DEFAULT_CALLBACK_PATH;
}

function getExpectedIssuer(): string | null {
  return import.meta.env.VITE_AEGIS_EXPECTED_ISSUER || null;
}

function getExpectedAudience(): string | null {
  return import.meta.env.VITE_AEGIS_EXPECTED_AUDIENCE || null;
}

function buildAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl, window.location.origin).toString();
}

function toSafeReturnPath(rawPath: string): string {
  if (!rawPath) return '/';
  if (/^https?:\/\//i.test(rawPath)) return '/';
  if (!rawPath.startsWith('/')) return '/';
  return rawPath;
}

function validateToken(token: string): TokenValidationResult {
  const payload = decodeJwtPayload<JwtPayload>(token);

  if (!payload) {
    return { valid: false, reason: 'Token payload could not be decoded' };
  }

  const exp =
    typeof payload.exp === 'number'
      ? payload.exp
      : typeof payload.exp === 'string'
        ? Number(payload.exp)
        : NaN;

  if (!Number.isFinite(exp)) {
    return { valid: false, reason: 'Token is missing exp claim' };
  }

  const expiresAt = exp * 1000;
  if (expiresAt - Date.now() <= REFRESH_BUFFER_MS) {
    return { valid: false, reason: 'Token is expired' };
  }

  const expectedIssuer = getExpectedIssuer();
  if (expectedIssuer) {
    if (typeof payload.iss !== 'string' || payload.iss !== expectedIssuer) {
      return {
        valid: false,
        reason: `Unexpected issuer: ${String(payload.iss)}`,
      };
    }
  }

  const expectedAudience = getExpectedAudience();
  if (expectedAudience) {
    const audiences = normalizeAudience(payload.aud);
    if (!audiences.includes(expectedAudience)) {
      return {
        valid: false,
        reason: `Unexpected audience: ${JSON.stringify(payload.aud)}`,
      };
    }
  }

  return { valid: true, payload, expiresAt };
}

function saveToken(token: string, payload: JwtPayload, expiresAt: number): void {
  cachedToken = { token, payload, expiresAt };
  sessionStorage.setItem(STORAGE_TOKEN_KEY, token);
}

function loadTokenFromSessionStorage(): string | null {
  return sessionStorage.getItem(STORAGE_TOKEN_KEY);
}

function deriveUserKey(payload: JwtPayload | null): string | null {
  const sub = payload?.sub;
  return typeof sub === 'string' && sub.length > 0 ? sub : null;
}

function getStoredReturnTo(): string | null {
  return sessionStorage.getItem('arlo_auth_return_to');
}

function clearStoredReturnTo(): void {
  sessionStorage.removeItem('arlo_auth_return_to');
}

function getAuthRedirectAttempts(): number {
  const raw = sessionStorage.getItem(AUTH_REDIRECT_ATTEMPTS_KEY);
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw) as { count?: unknown; startedAt?: unknown; returnTo?: unknown };
    const count = typeof parsed.count === 'number' ? parsed.count : Number(parsed.count);
    const startedAt = typeof parsed.startedAt === 'number' ? parsed.startedAt : Number(parsed.startedAt);
    const returnTo = typeof parsed.returnTo === 'string' ? parsed.returnTo : null;

    if (!Number.isFinite(count) || count <= 0) return 0;
    if (!Number.isFinite(startedAt) || startedAt <= 0) return 0;
    if (!returnTo) return 0;

    if (Date.now() - startedAt > AUTH_REDIRECT_WINDOW_MS) return 0;
    return count;
  } catch {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
}

function incrementAuthRedirectAttempts(returnTo: string): number {
  const safeReturnTo = toSafeReturnPath(returnTo);
  const raw = sessionStorage.getItem(AUTH_REDIRECT_ATTEMPTS_KEY);
  const now = Date.now();

  let count = 0;
  let startedAt = now;
  let storedReturnTo: string | null = null;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { count?: unknown; startedAt?: unknown; returnTo?: unknown };
      const parsedCount = typeof parsed.count === 'number' ? parsed.count : Number(parsed.count);
      const parsedStartedAt = typeof parsed.startedAt === 'number' ? parsed.startedAt : Number(parsed.startedAt);
      const parsedReturnTo = typeof parsed.returnTo === 'string' ? parsed.returnTo : null;

      if (Number.isFinite(parsedCount) && parsedCount > 0) count = parsedCount;
      if (Number.isFinite(parsedStartedAt) && parsedStartedAt > 0) startedAt = parsedStartedAt;
      storedReturnTo = parsedReturnTo;
    } catch {
      const parsedCount = Number(raw);
      if (Number.isFinite(parsedCount) && parsedCount > 0) count = parsedCount;
    }
  }

  const isExpired = now - startedAt > AUTH_REDIRECT_WINDOW_MS;
  const isDifferentTarget = storedReturnTo !== safeReturnTo;

  if (isExpired || isDifferentTarget) {
    count = 0;
    startedAt = now;
    storedReturnTo = safeReturnTo;
  }

  const next = count + 1;
  sessionStorage.setItem(
    AUTH_REDIRECT_ATTEMPTS_KEY,
    JSON.stringify({ count: next, startedAt, returnTo: storedReturnTo })
  );
  return next;
}

export function clearAuthRedirectAttempts(): void {
  sessionStorage.removeItem(AUTH_REDIRECT_ATTEMPTS_KEY);
}

type NavigateImpl = (url: string) => void;

let navigateImpl: NavigateImpl = (url) => {
  window.location.assign(url);
};

export function navigateTo(url: string): void {
  navigateImpl(url);
}

// Test-only hook to avoid JSDOM navigation errors.
export function __setNavigateImplForTests(impl: NavigateImpl | null): void {
  if (import.meta.env.MODE !== 'test') return;
  navigateImpl =
    impl ??
    ((url) => {
      window.location.assign(url);
    });
}

function redirectToAuthError(reason: string, returnTo?: string): void {
  const safeReturnTo = toSafeReturnPath(
    returnTo ?? getStoredReturnTo() ?? `${window.location.pathname}${window.location.search}${window.location.hash}`
  );
  const params = new URLSearchParams();
  params.set('reason', reason);
  params.set('return_to', safeReturnTo);
  navigateTo(`/auth/error?${params.toString()}`);
}

export function getAegisAuthorizeUrl(returnTo?: string): string {
  const callbackPath = getCallbackPath();
  const callbackUrl = new URL(buildAbsoluteUrl(callbackPath));

  if (returnTo) {
    callbackUrl.searchParams.set('return_to', returnTo);
  }

  return `${getAegisBaseUrl()}/authorize?app_name=${encodeURIComponent(getAegisAppName())}&next=${encodeURIComponent(callbackUrl.toString())}`;
}

export function redirectToAegisAuth(returnTo?: string): void {
  if (returnTo) {
    sessionStorage.setItem('arlo_auth_return_to', toSafeReturnPath(returnTo));
  }

  const target = toSafeReturnPath(
    returnTo ?? getStoredReturnTo() ?? `${window.location.pathname}${window.location.search}${window.location.hash}`
  );

  const attempts = incrementAuthRedirectAttempts(target);
  if (attempts > AUTH_REDIRECT_MAX_ATTEMPTS) {
    redirectToAuthError('Too many authentication redirects. Please try again.', returnTo);
    return;
  }

  navigateTo(getAegisAuthorizeUrl(target));
}

export function completeAuthFromCallback(rawToken: string | null): boolean {
  if (!rawToken) return false;

  const result = validateToken(rawToken);
  if (!result.valid || !result.payload || !result.expiresAt) {
    if (import.meta.env.DEV) {
      console.warn('[arloAuth] Callback token rejected:', result.reason);
    }
    clearArloToken();
    return false;
  }

  saveToken(rawToken, result.payload, result.expiresAt);
  clearAuthRedirectAttempts();
  return true;
}

export async function getArloToken(): Promise<string | null> {
  if (isPublicBookingDomain()) return null;

  if (cachedToken) {
    const result = validateToken(cachedToken.token);
    if (result.valid) return cachedToken.token;
    clearArloToken();
  }

  const stored = loadTokenFromSessionStorage();
  if (!stored) return null;

  const result = validateToken(stored);
  if (!result.valid || !result.payload || !result.expiresAt) {
    clearArloToken();
    return null;
  }

  saveToken(stored, result.payload, result.expiresAt);
  return stored;
}

export function isAuthenticated(): boolean {
  if (!cachedToken) return false;

  return validateToken(cachedToken.token).valid;
}

export function getIdentity(): { user?: string } | null {
  if (!cachedToken) return null;

  const user = deriveUserKey(cachedToken.payload);
  if (!user) return null;

  return { user };
}

export function getUserKey(): string | null {
  return getIdentity()?.user ?? null;
}

export function clearArloToken(): void {
  cachedToken = null;
  sessionStorage.removeItem(STORAGE_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(ARLO_AUTH_INVALIDATED_EVENT));
}

export function getTokenExpiresIn(): number {
  if (!cachedToken) return 0;
  return Math.max(0, cachedToken.expiresAt - Date.now());
}

export async function verifyArloAuth(): Promise<boolean> {
  const token = await getArloToken();
  return token !== null;
}

export async function getAuthHeaders(): Promise<HeadersInit | null> {
  const token = await getArloToken();
  if (!token) return null;

  return {
    [ARLO_AUTH_HEADER]: `Bearer ${token}`,
  };
}

export async function getAuthHeadersWithContentType(): Promise<HeadersInit | null> {
  const token = await getArloToken();
  if (!token) return null;

  return {
    [ARLO_AUTH_HEADER]: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function getPostAuthReturnPath(preferred?: string | null): string {
  if (preferred) return toSafeReturnPath(preferred);

  const stored = getStoredReturnTo();
  if (stored) {
    clearStoredReturnTo();
    return toSafeReturnPath(stored);
  }

  return '/';
}

export function shouldBypassAuthRedirect(pathname: string = window.location.pathname): boolean {
  if (isPublicBookingDomain()) return true;
  return AUTH_BYPASS_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

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
const AUTH_BYPASS_PATH_PREFIXES = ['/auth/callback', '/login', '/book', '/booking'];
const ARLO_AUTH_HEADER = 'X-Arlo-Authorization';
export const ARLO_AUTH_INVALIDATED_EVENT = 'arlo:auth-invalidated';

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

  if (typeof payload.exp !== 'number') {
    return { valid: false, reason: 'Token is missing exp claim' };
  }

  const expiresAt = payload.exp * 1000;
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
  window.location.assign(getAegisAuthorizeUrl(target));
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

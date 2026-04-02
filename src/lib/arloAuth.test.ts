import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as arloAuth from '@/lib/arloAuth';

describe('arloAuth redirect loop protection', () => {
  let navigateImplSpy: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    sessionStorage.clear();
    arloAuth.clearAuthRedirectAttempts();
    navigateImplSpy = vi.fn();
    arloAuth.__setNavigateImplForTests(navigateImplSpy);
  });

  afterEach(() => {
    arloAuth.__setNavigateImplForTests(null);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('redirects to auth error only after max attempts for same return_to within window', () => {
    arloAuth.redirectToAegisAuth('/dashboard');
    arloAuth.redirectToAegisAuth('/dashboard');
    arloAuth.redirectToAegisAuth('/dashboard');
    arloAuth.redirectToAegisAuth('/dashboard');

    const calls = navigateImplSpy.mock.calls.map(([url]) => String(url));
    expect(calls.slice(0, 3).every((url) => url.includes('/authorize?'))).toBe(true);
    expect(calls[3]).toBeDefined();
    expect(calls[3]!.startsWith('/auth/error?')).toBe(true);
    expect(calls[3]!).toContain('reason=');
    expect(calls[3]!).toContain('return_to=%2Fdashboard');
  });

  it('does not carry attempts across different return_to targets', () => {
    arloAuth.redirectToAegisAuth('/dashboard');
    arloAuth.redirectToAegisAuth('/dashboard');
    arloAuth.redirectToAegisAuth('/dashboard');
    arloAuth.redirectToAegisAuth('/settings');

    const calls = navigateImplSpy.mock.calls.map(([url]) => String(url));
    expect(calls.every((url) => url.includes('/authorize?'))).toBe(true);
  });

  it('expires attempts after the redirect window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T00:00:00.000Z'));

    arloAuth.redirectToAegisAuth('/dashboard');
    arloAuth.redirectToAegisAuth('/dashboard');
    arloAuth.redirectToAegisAuth('/dashboard');

    // Move time forward beyond the window.
    vi.setSystemTime(new Date('2026-04-02T00:02:00.000Z'));
    arloAuth.redirectToAegisAuth('/dashboard');

    const calls = navigateImplSpy.mock.calls.map(([url]) => String(url));
    expect(calls.every((url) => url.includes('/authorize?'))).toBe(true);
  });
});


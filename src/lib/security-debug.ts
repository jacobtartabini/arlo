export interface SecurityDebugEntryInput {
  label: string;
  status: number;
  ok: boolean;
  message: string;
  error?: unknown;
}

export const SECURITY_DEBUG_EVENT = 'arlo-security-debug';

export function isSecurityDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

export function emitSecurityDebugEntry(entry: SecurityDebugEntryInput): void {
  if (typeof window === 'undefined') return;
  if (!isSecurityDebugEnabled()) return;

  window.dispatchEvent(new CustomEvent(SECURITY_DEBUG_EVENT, { detail: entry }));
}

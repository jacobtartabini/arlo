

# Fix Tailscale API 502 Error for Audit Logs

## Root Cause

The 502 originates from Tailscale's upstream API (`/api/v2/tailnet/{tailnet}/logs`), not from your edge function. The edge function correctly forwards the error. Most likely causes:

1. **Tailscale plan limitation** — audit logs require a paid plan (the code already has a comment about this)
2. **Transient upstream failure** — Tailscale API temporarily unavailable
3. **API key permissions** — the key may lack audit log access

## Fix (two-part)

### 1. Add retry with backoff in the edge function (transient failures)

In `supabase/functions/tailscale-api/index.ts`, wrap the `fetch` call for `audit-logs` (and optionally other actions) in a retry helper that attempts up to 3 times with exponential backoff (500ms, 1s, 2s). This handles transient 502/503/504 from Tailscale.

```typescript
async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const response = await fetch(url, options);
    if (response.ok || i === retries || ![502, 503, 504].includes(response.status)) {
      return response;
    }
    await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
  }
  return fetch(url, options); // unreachable but satisfies TS
}
```

Replace `fetch(...)` calls in the `audit-logs`, `devices`, and `keys` handlers with `fetchWithRetry(...)`.

### 2. Improve frontend error handling in Services.tsx

The frontend already sets `auditError` on failure — that's correct. Add a user-friendly message distinguishing plan limitations from transient errors:

- If the error message contains "unavailable on current Tailscale plan", show a permanent info banner
- Otherwise show a "temporarily unavailable, try again" message with a retry button

This is a minor UI tweak in `loadAuditEvents` error handler (~5 lines).

**Files to edit:**
- `supabase/functions/tailscale-api/index.ts` — add `fetchWithRetry` helper, use it for all Tailscale API calls
- `src/pages/modules/Services.tsx` — improve audit error display messaging


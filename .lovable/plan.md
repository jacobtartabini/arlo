

# Investigation & Repair Plan: Arlo Integrations

## Goal
Diagnose and fix every external integration in Arlo so each one connects, syncs, and refreshes reliably: Google Calendar, Google Drive, Gmail, Outlook (mail + iCal), Microsoft Teams, Tailscale, Plaid, Strava, and Cartesia/Anthropic/Firecrawl proxies.

## Confirmed problem areas (from a first pass through the code)

1. **OAuth redirect URIs are hard-coded** to `https://arlo.jacobtartabini.com/...`:
   - `google-calendar-auth` → `/login`
   - `drive-auth` → `/settings`
   - `inbox-connect` → `/settings`
   
   If you sign in from any other host (Lovable preview, custom domain change, localhost), Google/Microsoft return `redirect_uri_mismatch` and the code-exchange step fails. The redirect target is also inconsistent across providers, which forces three different client-side callback handlers.

2. **Inconsistent callback detection on the frontend**:
   - `CalendarIntegrations` looks for `?google_callback=true`
   - `DriveIntegrations` and `InboxSettings` decode the OAuth `state` parameter
   - Whichever component mounts first on `/settings` can swallow the callback meant for another provider.

3. **Provider client-ID/secret pairs are partially shared**:
   - Calendar uses `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - Drive falls back to those but prefers `GOOGLE_DRIVE_CLIENT_ID/SECRET`
   - Gmail uses `GMAIL_CLIENT_ID/SECRET`
   - These three OAuth clients must each list every redirect URI we use, or only one provider will work at a time.

4. **Token refresh / encryption drift**: encrypted tokens are written with `encrypt()` but several sync paths don't handle the case where refresh fails (returns `null`) — they surface "Sync failed" with no actionable message and never mark the integration as needing re-auth.

5. **Tailscale**: requires `TAILSCALE_API_KEY` and `TAILSCALE_TAILNET` and a JWT whose `sub` matches an authorized user. Failures today are silent on the UI.

6. **Plaid / Strava / Twelve Data / Cartesia** are proxies — most likely failing only on auth header propagation or expired tokens, not on logic.

## Plan

### Phase 1 — Diagnose (before any code changes)
- Pull recent Edge Function logs for: `google-calendar-auth`, `drive-auth`, `inbox-connect`, `inbox-sync`, `calendar-sync`, `tailscale-api`, `plaid-api`, `strava-api`, `drive-api`.
- Group failures into: `redirect_uri_mismatch`, `invalid_grant`, `401 unauthorized`, `nonce_invalid`, `decrypt failed`, `5xx upstream`.
- Confirm the live host the user actually signs in from (production domain vs. Lovable preview) and which redirect URIs are registered in Google Cloud Console and Microsoft Entra.

### Phase 2 — Unify OAuth redirect handling
- Introduce a single canonical callback route: **`/auth/oauth-callback`**.
- All three edge functions (`google-calendar-auth`, `drive-auth`, `inbox-connect`) read the request `Origin`/`Referer` and build the redirect dynamically (`<origin>/auth/oauth-callback`) instead of a hard-coded host. Whitelist allowed origins server-side.
- One client-side handler (`AuthCallback.tsx` or a new `OAuthCallback.tsx`) decodes the `state` once, dispatches to the correct provider's `exchange_code` action, then routes the user back to `/settings?tab=<calendar|drive|inbox>`.
- Document the exact redirect URIs that must be added in Google Cloud Console (Calendar client, Drive client) and Microsoft Entra (Outlook/Teams client).

### Phase 3 — Harden each integration

| Integration | Fix |
|---|---|
| Google Calendar | Use unified callback; surface refresh-token failure as "Reconnect required" badge; verify `calendar-sync` writes `last_sync_status`/`last_sync_error` on every path. |
| Google Drive | Same callback + token-refresh fallback; ensure `drive-api` uses fresh access token via `drive-auth refresh_token` before listing files. |
| Gmail | Same callback; verify Gmail scopes still match what `inbox-sync` needs (read, send, modify); add structured error when token decrypt fails. |
| Outlook (OAuth) | Same callback; verify Microsoft client has matching redirect; handle `offline_access` refresh. |
| Outlook iCal | Validate URL on connect; surface 4xx vs 5xx separately. |
| Teams | Same callback; confirm Graph scopes; mark "preview" if not fully wired. |
| Tailscale | Add a UI status panel under Settings → Services that shows whether `TAILSCALE_API_KEY` / `TAILSCALE_TAILNET` are reachable; surface 401/403 from upstream as actionable text. |
| Plaid | Verify webhook signature path still works; confirm `PLAID_ENV` matches the secret tier; expose link-token errors in `PlaidLinkButton`. |
| Strava | Confirm refresh-token flow; show last sync status. |
| Cartesia / Anthropic / Firecrawl | These are AI proxies — already patched in the previous task. Just re-verify with one log pull. |

### Phase 4 — Shared resilience layer
- Add a small helper `withProviderErrorHandling()` used by every sync edge function: catches upstream errors, classifies them (`auth_expired`, `rate_limited`, `upstream_5xx`, `network`), writes a structured `last_sync_error` to the integration row, and returns a 200 with `{ fallback: true, reason }` so the UI never crashes.
- Add a "Reconnect" button on each integration card that appears whenever `last_sync_error` matches `auth_expired`.

### Phase 5 — Verification
- For each provider: connect → sync → simulate token expiry → re-sync → disconnect.
- Watch logs for clean `nonce` consumption, no `redirect_uri_mismatch`, and no `invalid_grant`.

## Technical details (for implementation phase)

- **Files to touch**:
  - `supabase/functions/google-calendar-auth/index.ts` — replace `getRedirectUri()` with origin-derived URI.
  - `supabase/functions/drive-auth/index.ts` — same.
  - `supabase/functions/inbox-connect/index.ts` — same; thread origin through `OAUTH_CONFIG`.
  - `supabase/functions/_shared/arloAuth.ts` — export `getAllowedRedirectUri(req)` helper using `ALLOWED_ORIGINS`.
  - `supabase/functions/calendar-sync/index.ts`, `inbox-sync/index.ts`, `drive-api/index.ts` — wrap upstream calls in shared error classifier.
  - `src/pages/AuthCallback.tsx` (or new `src/pages/OAuthCallback.tsx`) — single dispatcher reading `state.provider`.
  - `src/App.tsx` — register `/auth/oauth-callback` route.
  - `src/components/settings/CalendarIntegrations.tsx` / `DriveIntegrations.tsx` / `InboxSettings.tsx` — remove their inline callback handlers; add "Reconnect" affordance.

- **Required external setup the user must do once**:
  - In Google Cloud Console, add `https://<your-production-domain>/auth/oauth-callback` (and any preview/custom domain) to:
    - the OAuth client used by Calendar
    - the OAuth client used by Drive
    - the OAuth client used by Gmail
  - In Microsoft Entra, add the same URI to the Outlook/Teams app registration's "Web → Redirect URIs".

- **Out of scope for this pass**: rebuilding the Chrome extension's Gmail flow (it uses `chrome.identity` and is independent).

```text
Browser ──/auth/oauth-callback?code&state──┐
                                           ▼
                          OAuthCallback.tsx (decodes state.provider)
                                           │
        ┌───────────┬──────────────────────┼──────────────────────┐
        ▼           ▼                      ▼                      ▼
  google-calendar-auth   drive-auth                    inbox-connect (gmail/outlook/teams)
        │                    │                                    │
        └────── writes encrypted tokens + integration row ────────┘
```


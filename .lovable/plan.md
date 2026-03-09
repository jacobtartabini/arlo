

# Google Drive OAuth Connection Fix

## Root Cause

The Drive OAuth callback is never detected after Google redirects back to `/settings`. Here's why:

1. **`DriveIntegrations.tsx` line 61** checks `params.get('drive_callback') === 'true'` — but Google's OAuth redirect only includes `code` and `state` params. It never includes `drive_callback=true`.

2. **Line 112** appends `&state_param=drive_callback` to the OAuth URL, but Google ignores unknown parameters and does not relay them back in the redirect.

3. Meanwhile, **`InboxSettings.tsx`** (also on `/settings`) correctly handles OAuth callbacks by decoding the `state` parameter and checking if `decoded.provider` matches inbox providers. The Drive callback should use the same pattern since the state already contains `provider: "google_drive"`.

**Result**: After successful Google login, the user lands on `/settings?code=...&state=...`, but the Drive component ignores the params because `drive_callback` is never `true`. The code exchange never happens.

## Fix

**File: `src/components/settings/DriveIntegrations.tsx`**

Replace the broken callback detection (lines 59-71) with a pattern that mirrors `InboxSettings.tsx`:

```
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state');

if (code && state) {
  try {
    const decoded = JSON.parse(atob(state));
    if (decoded.provider === 'google_drive') {
      handleDriveCallback(code, state);
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch {
    // Not a drive callback, ignore
  }
}
```

Also remove the broken `&state_param=drive_callback` suffix on line 112 — it's unnecessary since the state parameter already encodes the provider:

```typescript
window.location.href = data.oauth_url;
```

**No edge function changes needed** — the `drive-auth` function already encodes `provider: "google_drive"` in the state via `encodeOAuthState(nonce, 'google_drive')` and correctly validates it on `exchange_code`.

## Summary

This is a one-file fix in `DriveIntegrations.tsx`: detect the callback by decoding the OAuth `state` param (which already contains `provider: "google_drive"`) instead of looking for a non-existent `drive_callback` URL parameter.


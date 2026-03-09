

# Notification System Analysis & Fix Plan

## Root Cause: Why No Notification History Shows Up

There are **two critical issues** preventing notifications from working:

### Issue 1: RLS Policies Block All Client-Side Access
The `notifications` table RLS policies use `auth.uid() = user_id`, but this app authenticates via **custom Arlo JWT** (not Supabase Auth). `auth.uid()` is always null for your sessions, so:
- The `NotificationsProvider` fetching via direct Supabase client → **returns empty** (blocked by RLS)
- The realtime subscription → **receives nothing** (blocked by RLS)
- `db.ts` functions (`markAsRead`, `archiveNotification`, `createNotification`) → **all fail silently**

### Issue 2: `send-push` Edge Function Inserts Invalid Column
The edge function inserts `type: notificationType` (line 95), but the `notifications` table has no `type` column. The insert either fails or the field is silently dropped. Even though `source` is also set correctly, this is fragile.

### Issue 3: Client-Side DB Layer Bypasses Data API
`src/lib/notifications/db.ts` uses the direct Supabase client instead of `dataApiHelpers` (which routes through the `data-api` edge function with Arlo JWT auth and service role key). Every other module (tasks, habits, etc.) uses `dataApiHelpers` — notifications is the exception, which is why only notifications are broken.

## Plan

### 1. Rewrite `src/lib/notifications/db.ts` to use `dataApiHelpers`
Replace all direct `supabase.from("notifications")` calls with `dataApiHelpers` calls, matching the pattern used by every other persistence hook. This routes through the `data-api` edge function which authenticates via Arlo JWT and uses the service role key (bypassing RLS).

Functions to rewrite:
- `fetchNotifications` → `dataApiHelpers.select("notifications", ...)`
- `fetchUnreadCount` → `dataApiHelpers.count("notifications", ...)`
- `markAsRead` → `dataApiHelpers.update("notifications", id, ...)`
- `markAllAsRead` → `dataApiHelpers.updateWhere("notifications", ...)`
- `archiveNotification` → `dataApiHelpers.update("notifications", id, ...)`
- `clearArchived` → needs a custom approach (delete where archived_at is not null)
- `createNotification` → `dataApiHelpers.insert("notifications", ...)`
- `fetchPreferences` → `dataApiHelpers.select("notification_preferences", ...)`

### 2. Fix `send-push` edge function insert
Remove the invalid `type` field from the insert payload (line 95). The `source` column already captures this correctly.

### 3. Update `NotificationsProvider` to use `dataApiHelpers`-based db functions
The provider already imports from `db.ts`, so once db.ts is fixed, the provider will work. Minor adjustments needed for the realtime subscription — it currently uses direct Supabase channel which may also be blocked by RLS. Will need to verify and potentially add a filter or rely on polling.

### 4. Add `isAuthenticated()` guard to notification hooks
The habit/task/calendar notification hooks call `getCurrentUserId()` which uses `supabase.auth.getUser()` — this returns null with Arlo JWT auth. Need to update `getCurrentUserId()` to use the Arlo auth system instead.

**Files to edit:**
- `src/lib/notifications/db.ts` — rewrite to use `dataApiHelpers`
- `src/lib/notifications/notify.ts` — fix `getCurrentUserId` to use Arlo auth, fix `showToast` to not fetch preferences on every call
- `supabase/functions/send-push/index.ts` — remove invalid `type` field from insert
- `src/providers/NotificationsProvider.tsx` — adjust realtime subscription approach


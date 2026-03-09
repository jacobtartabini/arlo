import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { getUserKey, isAuthenticated } from "@/lib/arloAuth";
import type { NotificationType, NotifyPayload } from "./types";

// Cached preferences to avoid fetching on every toast
let cachedPrefs: { toastEnabled: boolean; typeToggles: Record<string, boolean> } | null = null;
let prefsCachedAt = 0;
const PREFS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedPrefs() {
  if (cachedPrefs && Date.now() - prefsCachedAt < PREFS_CACHE_TTL_MS) {
    return cachedPrefs;
  }
  try {
    const { fetchPreferences } = await import("./db");
    const prefs = await fetchPreferences();
    if (prefs) {
      cachedPrefs = {
        toastEnabled: prefs.toastEnabled,
        typeToggles: prefs.typeToggles as Record<string, boolean>,
      };
      prefsCachedAt = Date.now();
    }
  } catch {
    // Ignore - use defaults
  }
  return cachedPrefs;
}

// Main notify function - call this from anywhere in the app
export async function notify(
  userId: string,
  payload: NotifyPayload
): Promise<{ success: boolean; notificationId?: string }> {
  const { type, title, body, data } = payload;

  console.log("[notify] Sending notification:", { userId, type, title });

  try {
    const result = await invokeEdgeFunction<{ success: boolean; notification_id?: string }>(
      "send-push",
      {
        type,
        title,
        body,
        data,
      }
    );

    if (!result.ok) {
      console.error("[notify] Error sending notification:", result.message);
      return { success: false };
    }

    return {
      success: true,
      notificationId: result.data?.notification_id,
    };
  } catch (error) {
    console.error("[notify] Error:", error);
    return { success: false };
  }
}

// Show a toast notification (for immediate feedback)
export async function showToast(
  type: NotificationType,
  title: string,
  description?: string
): Promise<void> {
  const prefs = await getCachedPrefs();
  if (prefs && !prefs.toastEnabled) return;
  if (prefs && prefs.typeToggles[type] === false) return;

  switch (type) {
    case "security":
      toast.warning(title, { description });
      break;
    case "calendar":
      toast.info(title, { description });
      break;
    case "chat":
      toast.success(title, { description });
      break;
    default:
      toast(title, { description });
  }
}

// Convenience methods for specific notification types
export async function notifyChat(
  userId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; notificationId?: string }> {
  return notify(userId, { type: "chat", title, body, data });
}

export async function notifyCalendar(
  userId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; notificationId?: string }> {
  return notify(userId, { type: "calendar", title, body, data });
}

export async function notifySecurity(
  userId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; notificationId?: string }> {
  return notify(userId, { type: "security", title, body, data });
}

export async function notifySystem(
  userId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; notificationId?: string }> {
  return notify(userId, { type: "system", title, body, data });
}

// Get current user key for convenience (uses Arlo auth, not Supabase auth)
export async function getCurrentUserId(): Promise<string | null> {
  if (!isAuthenticated()) return null;
  return getUserKey();
}

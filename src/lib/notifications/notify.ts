import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { NotificationType, NotifyPayload } from "./types";
import { fetchPreferences } from "./db";

// Main notify function - call this from anywhere in the app
export async function notify(
  userId: string,
  payload: NotifyPayload
): Promise<{ success: boolean; notificationId?: string }> {
  const { type, title, body, data } = payload;

  console.log('Sending notification:', { userId, type, title });

  try {
    // Call the edge function to handle the notification
    const { data: result, error } = await supabase.functions.invoke('send-push', {
      body: {
        user_id: userId,
        type,
        title,
        body,
        data,
      },
    });

    if (error) {
      console.error('Error sending notification:', error);
      return { success: false };
    }

    return { 
      success: true, 
      notificationId: result?.notification_id 
    };
  } catch (error) {
    console.error('Notify error:', error);
    return { success: false };
  }
}

// Show a toast notification (for immediate feedback)
export async function showToast(
  type: NotificationType,
  title: string,
  description?: string
): Promise<void> {
  // Check if toasts are enabled
  const prefs = await fetchPreferences();
  if (prefs && !prefs.toastEnabled) {
    return;
  }

  // Check type toggle
  if (prefs && prefs.typeToggles[type] === false) {
    return;
  }

  // Show toast based on type
  switch (type) {
    case 'security':
      toast.warning(title, { description });
      break;
    case 'calendar':
      toast.info(title, { description });
      break;
    case 'chat':
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
  return notify(userId, { type: 'chat', title, body, data });
}

export async function notifyCalendar(
  userId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; notificationId?: string }> {
  return notify(userId, { type: 'calendar', title, body, data });
}

export async function notifySecurity(
  userId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; notificationId?: string }> {
  return notify(userId, { type: 'security', title, body, data });
}

export async function notifySystem(
  userId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; notificationId?: string }> {
  return notify(userId, { type: 'system', title, body, data });
}

// Get current user ID for convenience
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

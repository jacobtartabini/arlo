import { dataApiHelpers } from "@/lib/data-api";
import { isAuthenticated } from "@/lib/arloAuth";
import type {
  AppNotification,
  NotificationPreferences,
  NotificationType,
} from "./types";

// Convert database notification to app notification
function dbToNotification(db: Record<string, unknown>): AppNotification {
  return {
    id: db.id as string,
    userId: (db.user_key as string) ?? "",
    type: ((db.source as string) || "system") as NotificationType,
    title: db.title as string,
    body: (db.content as string) ?? undefined,
    data: (db.action_data as Record<string, unknown>) ?? undefined,
    read: db.read as boolean,
    readAt: db.read_at ? new Date(db.read_at as string) : undefined,
    archivedAt: db.archived_at ? new Date(db.archived_at as string) : undefined,
    createdAt: new Date(db.created_at as string),
  };
}

// Fetch notifications with pagination
export async function fetchNotifications(
  limit = 50,
  _offset = 0,
  _includeArchived = false
): Promise<{ notifications: AppNotification[]; total: number }> {
  if (!isAuthenticated()) return { notifications: [], total: 0 };

  const { data, error } = await dataApiHelpers.select<Record<string, unknown>[]>(
    "notifications",
    {
      filters: _includeArchived ? undefined : { archived_at: null },
      order: { column: "created_at", ascending: false },
      limit,
    }
  );

  if (error || !data) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], total: 0 };
  }

  return {
    notifications: data.map(dbToNotification),
    total: data.length,
  };
}

// Fetch unread count
export async function fetchUnreadCount(): Promise<number> {
  if (!isAuthenticated()) return 0;

  const { count, error } = await dataApiHelpers.count("notifications", {
    read: false,
    archived_at: null,
  });

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count;
}

// Mark notification as read
export async function markAsRead(id: string): Promise<boolean> {
  if (!isAuthenticated()) return false;

  const { error } = await dataApiHelpers.update("notifications", id, {
    read: true,
    read_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }

  return true;
}

// Mark all notifications as read
export async function markAllAsRead(): Promise<boolean> {
  if (!isAuthenticated()) return false;

  const { error } = await dataApiHelpers.updateWhere(
    "notifications",
    { read: false, archived_at: null },
    { read: true, read_at: new Date().toISOString() }
  );

  if (error) {
    console.error("Error marking all as read:", error);
    return false;
  }

  return true;
}

// Archive notification
export async function archiveNotification(id: string): Promise<boolean> {
  if (!isAuthenticated()) return false;

  const { error } = await dataApiHelpers.update("notifications", id, {
    archived_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error archiving notification:", error);
    return false;
  }

  return true;
}

// Clear all archived notifications (delete them)
export async function clearArchived(): Promise<boolean> {
  if (!isAuthenticated()) return false;

  // Fetch archived notification IDs, then delete each
  const { data, error: fetchError } = await dataApiHelpers.select<Record<string, unknown>[]>(
    "notifications",
    {
      filters: { archived_at: "not_null" } as Record<string, unknown>,
      limit: 200,
    }
  );

  if (fetchError || !data) {
    console.error("Error fetching archived:", fetchError);
    return false;
  }

  for (const notif of data) {
    await dataApiHelpers.delete("notifications", notif.id as string);
  }

  return true;
}

// Fetch notification preferences
export async function fetchPreferences(): Promise<NotificationPreferences | null> {
  if (!isAuthenticated()) return null;

  const { data, error } = await dataApiHelpers.select<Record<string, unknown>[]>(
    "notification_preferences",
    { limit: 1 }
  );

  if (error || !data || data.length === 0) {
    // Return default preferences
    return {
      id: "",
      userId: "",
      inAppEnabled: true,
      toastEnabled: true,
      pushEnabled: false,
      typeToggles: {
        system: true,
        chat: true,
        calendar: true,
        security: true,
        habits: true,
        tasks: true,
      },
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    };
  }

  const db = data[0];
  return {
    id: db.id as string,
    userId: (db.user_key as string) ?? "",
    inAppEnabled: db.in_app_enabled as boolean,
    toastEnabled: db.toast_enabled as boolean,
    pushEnabled: db.push_enabled as boolean,
    typeToggles:
      (db.type_toggles as Record<NotificationType, boolean>) ?? {
        system: true,
        chat: true,
        calendar: true,
        security: true,
        habits: true,
        tasks: true,
      },
    quietHoursEnabled: db.quiet_hours_enabled as boolean,
    quietHoursStart: db.quiet_hours_start as string,
    quietHoursEnd: db.quiet_hours_end as string,
  };
}

// Update notification preferences
export async function updatePreferences(
  updates: Partial<{
    inAppEnabled: boolean;
    toastEnabled: boolean;
    pushEnabled: boolean;
    typeToggles: Record<NotificationType, boolean>;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }>
): Promise<boolean> {
  if (!isAuthenticated()) return false;

  const dbUpdates: Record<string, unknown> = {};
  if (updates.inAppEnabled !== undefined) dbUpdates.in_app_enabled = updates.inAppEnabled;
  if (updates.toastEnabled !== undefined) dbUpdates.toast_enabled = updates.toastEnabled;
  if (updates.pushEnabled !== undefined) dbUpdates.push_enabled = updates.pushEnabled;
  if (updates.typeToggles !== undefined) dbUpdates.type_toggles = updates.typeToggles;
  if (updates.quietHoursEnabled !== undefined) dbUpdates.quiet_hours_enabled = updates.quietHoursEnabled;
  if (updates.quietHoursStart !== undefined) dbUpdates.quiet_hours_start = updates.quietHoursStart;
  if (updates.quietHoursEnd !== undefined) dbUpdates.quiet_hours_end = updates.quietHoursEnd;

  const { error } = await dataApiHelpers.upsert("notification_preferences", dbUpdates);

  if (error) {
    console.error("Error updating preferences:", error);
    return false;
  }

  return true;
}

// Create a notification
export async function createNotification(
  type: NotificationType,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<AppNotification | null> {
  if (!isAuthenticated()) return null;

  const { data: notification, error } = await dataApiHelpers.insert<Record<string, unknown>>(
    "notifications",
    {
      title,
      content: body || null,
      source: type,
      action_data: data || null,
      read: false,
    }
  );

  if (error || !notification) {
    console.error("Error creating notification:", error);
    return null;
  }

  return dbToNotification(notification);
}

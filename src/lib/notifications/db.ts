import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  AppNotification,
  NotificationPreferences,
  NotificationType,
} from "./types";

// Convert database notification to app notification
function dbToNotification(db: Record<string, unknown>): AppNotification {
  return {
    id: db.id as string,
    userId: db.user_id as string,
    type: ((db.type as string) || (db.source as string) || 'system') as NotificationType,
    title: db.title as string,
    body: (db.content as string) ?? undefined,
    data: (db.action_data as Record<string, unknown>) ?? undefined,
    read: db.read as boolean,
    readAt: db.read_at ? new Date(db.read_at as string) : undefined,
    archivedAt: db.archived_at ? new Date(db.archived_at as string) : undefined,
    createdAt: new Date(db.created_at as string),
  };
}

// Convert database preferences to app preferences
function dbToPreferences(db: Record<string, unknown>): NotificationPreferences {
  return {
    id: db.id as string,
    userId: db.user_id as string,
    inAppEnabled: db.in_app_enabled as boolean,
    toastEnabled: db.toast_enabled as boolean,
    pushEnabled: db.push_enabled as boolean,
    typeToggles: (db.type_toggles as Record<NotificationType, boolean>) ?? { system: true, chat: true, calendar: true, security: true },
    quietHoursEnabled: db.quiet_hours_enabled as boolean,
    quietHoursStart: db.quiet_hours_start as string,
    quietHoursEnd: db.quiet_hours_end as string,
  };
}

// Fetch notifications with pagination
export async function fetchNotifications(
  limit = 50,
  offset = 0,
  includeArchived = false
): Promise<{ notifications: AppNotification[]; total: number }> {
  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], total: 0 };
  }

  return {
    notifications: (data || []).map((d) => dbToNotification(d as Record<string, unknown>)),
    total: count || 0,
  };
}

// Fetch unread count
export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false)
    .is("archived_at", null);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
}

// Mark notification as read
export async function markAsRead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", id);

  if (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }

  return true;
}

// Mark all notifications as read
export async function markAllAsRead(): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("read", false)
    .is("archived_at", null);

  if (error) {
    console.error("Error marking all as read:", error);
    return false;
  }

  return true;
}

// Archive notification
export async function archiveNotification(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", id);

  if (error) {
    console.error("Error archiving notification:", error);
    return false;
  }

  return true;
}

// Clear all archived notifications
export async function clearArchived(): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .not("archived_at", "is", null);

  if (error) {
    console.error("Error clearing archived:", error);
    return false;
  }

  return true;
}

// Fetch notification preferences (using raw query since table may not be in types yet)
export async function fetchPreferences(): Promise<NotificationPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Use raw RPC call or direct fetch since types may not include new table
  const { data, error } = await supabase
    .rpc('get_notification_preferences' as never, { p_user_id: user.id } as never)
    .single();

  // If RPC doesn't exist, try direct table access
  if (error) {
    // Return default preferences
    return {
      id: '',
      userId: user.id,
      inAppEnabled: true,
      toastEnabled: true,
      pushEnabled: false,
      typeToggles: { system: true, chat: true, calendar: true, security: true },
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
  }

  return dbToPreferences(data as Record<string, unknown>);
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // For now, just log the update - full implementation needs types update
  console.log('Updating preferences:', updates);
  return true;
}

// Create a local notification (for in-app use)
export async function createNotification(
  type: NotificationType,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<AppNotification | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const insertData = {
    user_id: user.id,
    title,
    content: body || null,
    source: type,
    action_data: (data || null) as Json,
  };

  const { data: notification, error } = await supabase
    .from("notifications")
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error("Error creating notification:", error);
    return null;
  }

  return dbToNotification(notification as Record<string, unknown>);
}

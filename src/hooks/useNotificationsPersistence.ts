import { supabase } from "@/integrations/supabase/client";
import type { Notification } from "@/types/notifications";

interface DbNotification {
  id: string;
  user_id: string;
  source: string;
  title: string;
  content: string | null;
  read: boolean;
  action_type: string | null;
  action_data: Record<string, unknown> | null;
  created_at: string;
}

const dbToNotification = (db: DbNotification): Notification => ({
  id: db.id,
  source: db.source,
  title: db.title,
  content: db.content ?? undefined,
  read: db.read,
  actionType: db.action_type ?? undefined,
  actionData: db.action_data ?? undefined,
  createdAt: new Date(db.created_at),
});

export function useNotificationsPersistence() {
  const fetchNotifications = async (): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }

    return (data as DbNotification[]).map(dbToNotification);
  };

  const fetchUnreadCount = async (): Promise<number> => {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false);

    if (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }

    return count ?? 0;
  };

  const createNotification = async (
    title: string,
    content?: string,
    source?: string,
    actionType?: string,
    actionData?: Record<string, unknown>
  ): Promise<Notification | null> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const insertData = {
      user_id: userData.user.id,
      title,
      content: content ?? null,
      source: source ?? "system",
      action_type: actionType ?? null,
      action_data: actionData ?? null,
    };

    const { data, error } = await supabase
      .from("notifications")
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return null;
    }

    return dbToNotification(data as DbNotification);
  };

  const markAsRead = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }

    return true;
  };

  const markAllAsRead = async (): Promise<boolean> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userData.user.id)
      .eq("read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }

    return true;
  };

  const deleteNotification = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);

    if (error) {
      console.error("Error deleting notification:", error);
      return false;
    }

    return true;
  };

  return {
    fetchNotifications,
    fetchUnreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

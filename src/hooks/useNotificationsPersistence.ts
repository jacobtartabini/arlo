import { dataApiHelpers } from "@/lib/data-api";
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

/**
 * Check if Tailscale is verified
 */
function isTailscaleVerified(): boolean {
  if (typeof window === 'undefined') return false;
  const verified = sessionStorage.getItem('arlo_access_verified') === 'true';
  const expiry = sessionStorage.getItem('arlo_access_verified_expiry');
  return verified && !!expiry && Date.now() < parseInt(expiry);
}

export function useNotificationsPersistence() {
  const fetchNotifications = async (): Promise<Notification[]> => {
    if (!isTailscaleVerified()) return [];

    const { data, error } = await dataApiHelpers.select<DbNotification[]>('notifications', {
      order: { column: 'created_at', ascending: false },
      limit: 50,
    });

    if (error || !data) {
      console.error("Error fetching notifications:", error);
      return [];
    }

    return data.map(dbToNotification);
  };

  const fetchUnreadCount = async (): Promise<number> => {
    if (!isTailscaleVerified()) return 0;

    const { count, error } = await dataApiHelpers.count('notifications', { read: false });

    if (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }

    return count;
  };

  const createNotification = async (
    title: string,
    content?: string,
    source?: string,
    actionType?: string,
    actionData?: Record<string, unknown>
  ): Promise<Notification | null> => {
    if (!isTailscaleVerified()) return null;

    const { data, error } = await dataApiHelpers.insert<DbNotification>('notifications', {
      title,
      content: content ?? null,
      source: source ?? "system",
      action_type: actionType ?? null,
      action_data: actionData ?? null,
    });

    if (error || !data) {
      console.error("Error creating notification:", error);
      return null;
    }

    return dbToNotification(data);
  };

  const markAsRead = async (id: string): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;

    const { error } = await dataApiHelpers.update('notifications', id, { read: true });

    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }

    return true;
  };

  const markAllAsRead = async (): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;

    const { error } = await dataApiHelpers.updateWhere(
      'notifications',
      { read: false },
      { read: true }
    );

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }

    return true;
  };

  const deleteNotification = async (id: string): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;

    const { error } = await dataApiHelpers.delete('notifications', id);

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

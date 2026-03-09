import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { isAuthenticated } from '@/lib/arloAuth';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead as markAsReadDb,
  markAllAsRead as markAllAsReadDb,
  archiveNotification as archiveNotificationDb,
} from '@/lib/notifications/db';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/notifications/push';
import type { AppNotification, NotificationPreferences } from '@/lib/notifications/types';
import { isPublicBookingDomain } from '@/lib/domain-utils';

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  preferences: NotificationPreferences | null;
  pushPermission: NotificationPermission;
  isPushSupported: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<boolean>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Poll interval for checking new notifications (60 seconds)
const POLL_INTERVAL_MS = 60 * 1000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const pollRef = useRef<number | null>(null);
  const prevUnreadRef = useRef<number>(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const [{ notifications: notifs }, count] = await Promise.all([
        fetchNotifications(50, 0),
        fetchUnreadCount(),
      ]);
      setNotifications(notifs);

      // If new notifications arrived, show a toast for the newest one
      if (count > prevUnreadRef.current && notifs.length > 0) {
        const newest = notifs[0];
        if (!newest.read) {
          toast(newest.title, { description: newest.body });
        }
      }
      prevUnreadRef.current = count;
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const success = await markAsReadDb(id);
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const success = await markAllAsReadDb();
    if (success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    }
  }, []);

  const archive = useCallback(async (id: string) => {
    const success = await archiveNotificationDb(id);
    if (success) {
      const notif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notif && !notif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  }, [notifications]);

  const enablePush = useCallback(async () => {
    const success = await subscribeToPush();
    if (success) {
      setPushPermission('granted');
      toast.success('Push notifications enabled');
    }
    return success;
  }, []);

  const disablePush = useCallback(async () => {
    const success = await unsubscribeFromPush();
    if (success) {
      toast.success('Push notifications disabled');
    }
    return success;
  }, []);

  // Initial load + polling - skip on public booking domains
  useEffect(() => {
    if (isPublicBookingDomain()) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      setIsLoading(true);
      setPushPermission(getNotificationPermission());
      await refresh();
      setIsLoading(false);
    };
    init();

    // Poll for new notifications instead of relying on realtime
    // (Realtime uses direct Supabase client which is blocked by RLS for Arlo JWT auth)
    pollRef.current = window.setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, [refresh]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        preferences,
        pushPermission,
        isPushSupported: isPushSupported(),
        refresh,
        markAsRead,
        markAllAsRead,
        archive,
        enablePush,
        disablePush,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}

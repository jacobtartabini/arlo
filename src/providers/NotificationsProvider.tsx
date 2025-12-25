import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  const refresh = useCallback(async () => {
    try {
      const [{ notifications: notifs }, count] = await Promise.all([
        fetchNotifications(50, 0),
        fetchUnreadCount(),
      ]);
      setNotifications(notifs);
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
      setNotifications(prev => prev.filter(n => n.id !== id));
      const notif = notifications.find(n => n.id === id);
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

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setPushPermission(getNotificationPermission());
      await refresh();
      setIsLoading(false);
    };
    init();
  }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Record<string, unknown>;
          const appNotif: AppNotification = {
            id: newNotif.id as string,
            userId: newNotif.user_id as string,
            type: (newNotif.type || newNotif.source || 'system') as AppNotification['type'],
            title: newNotif.title as string,
            body: newNotif.content as string | undefined,
            data: newNotif.action_data as Record<string, unknown> | undefined,
            read: false,
            createdAt: new Date(newNotif.created_at as string),
          };
          
          setNotifications(prev => [appNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notifications
          toast(appNotif.title, { description: appNotif.body });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

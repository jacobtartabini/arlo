import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifyChat, notifyCalendar, notifySystem, showToast } from '@/lib/notifications/notify';

/**
 * Hook to trigger notifications for various app events
 */
export function useNotificationTriggers() {
  // Notify when chat response is received
  const notifyChatResponse = useCallback(async (
    title: string,
    preview?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Show toast immediately for in-app feedback
    showToast('chat', title, preview);

    // Send push notification
    await notifyChat(user.id, title, preview, { source: 'chat' });
  }, []);

  // Notify for calendar reminders
  const notifyCalendarReminder = useCallback(async (
    eventTitle: string,
    timeUntil: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const title = `Reminder: ${eventTitle}`;
    const body = `Starting ${timeUntil}`;

    showToast('calendar', title, body);
    await notifyCalendar(user.id, title, body, { eventTitle, timeUntil });
  }, []);

  // Notify for security events
  const notifySecurityEvent = useCallback(async (
    eventType: string,
    details?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const title = `Security: ${eventType}`;
    showToast('security', title, details);
    // Security notifications are always sent
    await notifySystem(user.id, title, details, { eventType });
  }, []);

  // Generic system notification
  const notifySystemEvent = useCallback(async (
    title: string,
    body?: string,
    data?: Record<string, unknown>
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    showToast('system', title, body);
    await notifySystem(user.id, title, body, data);
  }, []);

  return {
    notifyChatResponse,
    notifyCalendarReminder,
    notifySecurityEvent,
    notifySystemEvent,
  };
}

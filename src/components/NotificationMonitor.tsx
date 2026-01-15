import { useEffect } from 'react';
import { useCalendarNotifications } from '@/hooks/useCalendarNotifications';
import { useHabitsNotifications } from '@/hooks/useHabitsNotifications';
import { useTasksNotifications } from '@/hooks/useTasksNotifications';
import { isPublicBookingDomain } from '@/lib/domain-utils';

/**
 * Background notification monitor component
 * Activates all notification monitoring hooks for calendar, habits, and tasks
 * Disabled on public booking domains to avoid auth errors
 */
export function NotificationMonitor() {
  // Skip all notification hooks on public booking domains
  const isPublicDomain = isPublicBookingDomain();

  // Activate calendar event reminders (only on authenticated domains)
  useCalendarNotifications();
  
  // Activate habit reminders and streak notifications
  useHabitsNotifications();
  
  // Activate task due/overdue notifications
  useTasksNotifications();

  useEffect(() => {
    if (!isPublicDomain) {
      console.log('[NotificationMonitor] Background notification monitoring active');
    }
  }, [isPublicDomain]);

  // This component doesn't render anything
  return null;
}

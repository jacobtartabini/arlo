import { useEffect } from 'react';
import { useCalendarNotifications } from '@/hooks/useCalendarNotifications';
import { useHabitsNotifications } from '@/hooks/useHabitsNotifications';
import { useTasksNotifications } from '@/hooks/useTasksNotifications';

/**
 * Background notification monitor component
 * Activates all notification monitoring hooks for calendar, habits, and tasks
 */
export function NotificationMonitor() {
  // Activate calendar event reminders
  useCalendarNotifications();
  
  // Activate habit reminders and streak notifications
  useHabitsNotifications();
  
  // Activate task due/overdue notifications
  useTasksNotifications();

  useEffect(() => {
    console.log('[NotificationMonitor] Background notification monitoring active');
  }, []);

  // This component doesn't render anything
  return null;
}

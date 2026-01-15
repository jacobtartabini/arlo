import { useEffect, useRef, useCallback } from 'react';
import { useCalendarPersistence } from './useCalendarPersistence';
import { notifyCalendar, showToast, getCurrentUserId } from '@/lib/notifications/notify';
import type { CalendarEvent } from '@/lib/calendar-data';
import { isPublicBookingDomain } from '@/lib/domain-utils';

interface ReminderCheck {
  eventId: string;
  minutesBefore: number;
  fired: boolean;
}

// Default reminder times in minutes
const DEFAULT_REMINDERS = [60, 15, 5];

/**
 * Hook to monitor calendar events and send reminders
 * Disabled on public booking domains
 */
export function useCalendarNotifications() {
  // Skip on public booking domains
  const isPublicDomain = isPublicBookingDomain();
  
  const { events } = useCalendarPersistence();
  const firedRemindersRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<number | null>(null);

  // Generate all occurrences of recurring events for the next 24 hours
  const generateOccurrences = useCallback((event: CalendarEvent): Date[] => {
    const occurrences: Date[] = [];
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const baseStart = new Date(`${event.date}T${event.startTime}:00`);
    
    if (!event.recurrence) {
      if (baseStart >= now && baseStart <= tomorrow) {
        occurrences.push(baseStart);
      }
      return occurrences;
    }

    const { frequency, interval = 1, end } = event.recurrence;
    
    // Get end date from recurrence end rule
    let endDateStr: string | undefined;
    if (end) {
      if (end.type === 'onDate') {
        endDateStr = end.date;
      }
    }

    let checkDate = new Date(baseStart);
    
    // Start from today if the base date is in the past
    if (checkDate < now) {
      checkDate = new Date(now);
      checkDate.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
    }

    const endCheck = endDateStr ? new Date(endDateStr) : tomorrow;
    const actualEnd = endCheck < tomorrow ? endCheck : tomorrow;

    while (checkDate <= actualEnd) {
      if (checkDate >= now) {
        occurrences.push(new Date(checkDate));
      }

      // Advance based on recurrence type
      switch (frequency) {
        case 'daily':
          checkDate.setDate(checkDate.getDate() + interval);
          break;
        case 'weekly':
          checkDate.setDate(checkDate.getDate() + 7 * interval);
          break;
        case 'monthly':
          checkDate.setMonth(checkDate.getMonth() + interval);
          break;
        case 'yearly':
          checkDate.setFullYear(checkDate.getFullYear() + interval);
          break;
        default:
          checkDate = new Date(actualEnd.getTime() + 1); // Exit loop
      }
    }

    return occurrences;
  }, []);

  // Format time until event
  const formatTimeUntil = (minutesUntil: number): string => {
    if (minutesUntil < 1) return 'now';
    if (minutesUntil < 60) return `in ${Math.round(minutesUntil)} minute${minutesUntil !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutesUntil / 60);
    const mins = Math.round(minutesUntil % 60);
    if (mins === 0) return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    return `in ${hours}h ${mins}m`;
  };

  // Check for upcoming events and send reminders
  const checkReminders = useCallback(async () => {
    if (events.length === 0) return;

    const userId = await getCurrentUserId();
    if (!userId) return;

    const now = new Date();

    for (const event of events) {
      const occurrences = generateOccurrences(event);

      for (const occurrence of occurrences) {
        const minutesUntil = (occurrence.getTime() - now.getTime()) / (1000 * 60);

        for (const reminderMinutes of DEFAULT_REMINDERS) {
          const reminderKey = `${event.id}-${occurrence.getTime()}-${reminderMinutes}`;
          
          // Skip if already fired
          if (firedRemindersRef.current.has(reminderKey)) continue;

          // Check if we're within the reminder window (within 1 minute of the reminder time)
          const diff = Math.abs(minutesUntil - reminderMinutes);
          if (diff <= 1 && minutesUntil > 0) {
            firedRemindersRef.current.add(reminderKey);
            
            const timeUntil = formatTimeUntil(minutesUntil);
            const title = `Reminder: ${event.title}`;
            const body = `Starting ${timeUntil}${event.location ? ` at ${event.location}` : ''}`;

            // Show toast for in-app notification
            showToast('calendar', title, body);

            // Send push notification
            await notifyCalendar(userId, title, body, {
              eventId: event.id,
              startTime: occurrence.toISOString(),
              category: event.category,
            });

            console.log(`[Calendar Notification] ${title} - ${body}`);
          }
        }

        // Also notify when event starts (0 minutes before)
        const startKey = `${event.id}-${occurrence.getTime()}-start`;
        if (!firedRemindersRef.current.has(startKey) && minutesUntil >= -1 && minutesUntil <= 1) {
          firedRemindersRef.current.add(startKey);
          
          const title = `Starting Now: ${event.title}`;
          const body = event.location ? `Location: ${event.location}` : 'Your event is starting now';

          showToast('calendar', title, body);
          await notifyCalendar(userId, title, body, {
            eventId: event.id,
            startTime: occurrence.toISOString(),
          });
        }
      }
    }

    // Clean up old fired reminders (older than 2 hours)
    const twoHoursAgo = now.getTime() - 2 * 60 * 60 * 1000;
    for (const key of firedRemindersRef.current) {
      const parts = key.split('-');
      const timestamp = parseInt(parts[parts.length - 2], 10);
      if (timestamp < twoHoursAgo) {
        firedRemindersRef.current.delete(key);
      }
    }
  }, [events, generateOccurrences]);

  // Set up interval to check reminders every minute
  useEffect(() => {
    // Skip on public booking domains
    if (isPublicDomain) return;

    checkReminders(); // Check immediately
    checkIntervalRef.current = window.setInterval(checkReminders, 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkReminders, isPublicDomain]);

  return { checkReminders };
}

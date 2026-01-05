import { useEffect, useRef, useCallback } from 'react';
import { useUserSettings } from '@/providers/UserSettingsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { 
  isPushSupported, 
  getNotificationPermission,
  requestNotificationPermission 
} from '@/lib/notifications/push';

const STORAGE_KEY = 'arlo-morning-wakeup-last-shown';

export function useMorningWakeup() {
  const { settings } = useUserSettings();
  const { isAuthenticated } = useAuth();
  const scheduledTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasScheduledRef = useRef(false);

  // Check if we've already shown today's notification
  const hasShownToday = useCallback(() => {
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (!lastShown) return false;
    
    const lastDate = new Date(lastShown);
    const today = new Date();
    
    return (
      lastDate.getFullYear() === today.getFullYear() &&
      lastDate.getMonth() === today.getMonth() &&
      lastDate.getDate() === today.getDate()
    );
  }, []);

  // Mark as shown today
  const markAsShownToday = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }, []);

  // Show the notification
  const showMorningNotification = useCallback(async () => {
    if (hasShownToday()) return;

    // Check notification permission
    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      // Try requesting permission
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }
    }

    // Create and show the notification
    const notification = new Notification('Good Morning! ☀️', {
      body: 'Ready to start your day? Check your schedule and morning routine.',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'morning-wakeup',
      requireInteraction: true,
      data: {
        url: '/morning'
      }
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/morning';
      notification.close();
    };

    markAsShownToday();
  }, [hasShownToday, markAsShownToday]);

  // Calculate ms until next scheduled time
  const getMsUntilWakeup = useCallback((wakeupTime: string) => {
    const [hours, minutes] = wakeupTime.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    
    target.setHours(hours, minutes, 0, 0);
    
    // If target time has passed today, schedule for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    
    return target.getTime() - now.getTime();
  }, []);

  // Schedule the notification
  const scheduleNotification = useCallback(() => {
    if (!settings?.morning_wakeup_enabled) return;
    if (!isAuthenticated) return;
    if (hasScheduledRef.current) return;

    const wakeupTime = settings.morning_wakeup_time || '07:00';
    const msUntil = getMsUntilWakeup(wakeupTime);

    // Clear any existing timeout
    if (scheduledTimeoutRef.current) {
      clearTimeout(scheduledTimeoutRef.current);
    }

    // Don't schedule if more than 24 hours away (will reschedule on page load)
    if (msUntil > 24 * 60 * 60 * 1000) return;

    console.log(`Morning wakeup scheduled for ${wakeupTime} (in ${Math.round(msUntil / 60000)} minutes)`);
    
    scheduledTimeoutRef.current = setTimeout(() => {
      showMorningNotification();
      hasScheduledRef.current = false;
      // Reschedule for tomorrow
      scheduleNotification();
    }, msUntil);

    hasScheduledRef.current = true;
  }, [settings, isAuthenticated, getMsUntilWakeup, showMorningNotification]);

  // Initial setup and cleanup
  useEffect(() => {
    if (!settings || !isAuthenticated) return;
    if (!settings.morning_wakeup_enabled) return;

    // Check if we should show immediately (if current time is within 5 min of wakeup time)
    const wakeupTime = settings.morning_wakeup_time || '07:00';
    const [hours, minutes] = wakeupTime.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    const diffMs = Math.abs(now.getTime() - target.getTime());
    const fiveMinutes = 5 * 60 * 1000;

    if (diffMs <= fiveMinutes && !hasShownToday()) {
      // Current time is within 5 minutes of wakeup time, show now
      showMorningNotification();
    }

    // Schedule for future
    scheduleNotification();

    return () => {
      if (scheduledTimeoutRef.current) {
        clearTimeout(scheduledTimeoutRef.current);
        hasScheduledRef.current = false;
      }
    };
  }, [settings, isAuthenticated, scheduleNotification, showMorningNotification, hasShownToday]);

  return {
    isEnabled: settings?.morning_wakeup_enabled ?? true,
    wakeupTime: settings?.morning_wakeup_time ?? '07:00',
    showMorningNotification,
    hasShownToday: hasShownToday(),
  };
}
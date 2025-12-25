import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify, showToast } from '@/lib/notifications/notify';
import type { NotificationType } from '@/lib/notifications/types';

/**
 * Hook to trigger notifications for various app events
 */
export function useNotificationTriggers() {
  // Get current user ID
  const getUserId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }, []);

  // Generic notification trigger
  const triggerNotification = useCallback(async (
    type: NotificationType,
    title: string,
    body?: string,
    data?: Record<string, unknown>
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    showToast(type, title, body);
    await notify(userId, { type, title, body, data });
  }, [getUserId]);

  // Chat notifications
  const notifyChatResponse = useCallback(async (
    title: string,
    preview?: string
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    showToast('chat', title, preview);
    await notify(userId, { 
      type: 'chat', 
      title, 
      body: preview, 
      data: { source: 'chat' } 
    });
  }, [getUserId]);

  // Calendar notifications
  const notifyCalendarReminder = useCallback(async (
    eventTitle: string,
    timeUntil: string,
    eventId?: string
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    const title = `Reminder: ${eventTitle}`;
    const body = `Starting ${timeUntil}`;

    showToast('calendar', title, body);
    await notify(userId, { 
      type: 'calendar', 
      title, 
      body, 
      data: { eventTitle, timeUntil, eventId } 
    });
  }, [getUserId]);

  // Habit notifications
  const notifyHabitReminder = useCallback(async (
    routineName: string,
    routineType: 'morning' | 'night' | 'custom',
    habitCount: number
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    const emoji = routineType === 'morning' ? '☀️' : routineType === 'night' ? '🌙' : '📋';
    const title = `${emoji} Time for ${routineName}`;
    const body = `${habitCount} habit${habitCount > 1 ? 's' : ''} to complete`;

    showToast('habits', title, body);
    await notify(userId, { 
      type: 'habits', 
      title, 
      body, 
      data: { routineType, habitCount } 
    });
  }, [getUserId]);

  const notifyStreakWarning = useCallback(async (
    habitTitle: string,
    currentStreak: number
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    const title = `🔥 ${currentStreak}-day streak at risk!`;
    const body = `Don't lose your ${habitTitle} streak - complete it before midnight`;

    showToast('habits', title, body);
    await notify(userId, { 
      type: 'habits', 
      title, 
      body, 
      data: { habitTitle, currentStreak, action: 'streak_warning' } 
    });
  }, [getUserId]);

  const notifyStreakMilestone = useCallback(async (
    habitTitle: string,
    streak: number
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    const emoji = streak >= 100 ? '🏆' : streak >= 30 ? '🎉' : '⭐';
    const title = `${emoji} ${streak}-day streak!`;
    const body = `Amazing! You've completed ${habitTitle} for ${streak} days in a row!`;

    showToast('habits', title, body);
    await notify(userId, { 
      type: 'habits', 
      title, 
      body, 
      data: { habitTitle, streak, milestone: streak } 
    });
  }, [getUserId]);

  // Task notifications
  const notifyTaskDueSoon = useCallback(async (
    taskTitle: string,
    timeUntil: string
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    const title = '⏰ Task due soon';
    const body = `"${taskTitle}" is due ${timeUntil}`;

    showToast('tasks', title, body);
    await notify(userId, { 
      type: 'tasks', 
      title, 
      body, 
      data: { taskTitle, action: 'due_soon' } 
    });
  }, [getUserId]);

  const notifyTaskOverdue = useCallback(async (
    taskTitle: string,
    timeOverdue: string
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    const title = '🚨 Overdue task';
    const body = `"${taskTitle}" is ${timeOverdue}`;

    showToast('tasks', title, body);
    await notify(userId, { 
      type: 'tasks', 
      title, 
      body, 
      data: { taskTitle, action: 'overdue' } 
    });
  }, [getUserId]);

  const notifyTaskCompleted = useCallback(async (taskTitle: string) => {
    showToast('tasks', '✓ Task completed', taskTitle);
    // Don't send push for task completion - just toast
  }, []);

  // Security notifications
  const notifySecurityEvent = useCallback(async (
    eventType: string,
    details?: string
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    const title = `Security: ${eventType}`;
    showToast('security', title, details);
    await notify(userId, { 
      type: 'security', 
      title, 
      body: details, 
      data: { eventType } 
    });
  }, [getUserId]);

  const notifyNewLogin = useCallback(async (
    deviceName: string,
    isNewDevice: boolean
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    const title = isNewDevice ? '🔐 New device login' : '✓ Login successful';
    const body = isNewDevice 
      ? `Signed in from a new ${deviceName}` 
      : `Signed in on ${deviceName}`;

    showToast('security', title, body);
    await notify(userId, { 
      type: 'security', 
      title, 
      body, 
      data: { deviceName, isNewDevice, action: isNewDevice ? 'new_device' : 'login' } 
    });
  }, [getUserId]);

  // System notifications
  const notifySystemEvent = useCallback(async (
    title: string,
    body?: string,
    data?: Record<string, unknown>
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    showToast('system', title, body);
    await notify(userId, { type: 'system', title, body, data });
  }, [getUserId]);

  const notifyJobStatus = useCallback(async (
    jobName: string,
    status: 'completed' | 'failed',
    details?: string
  ) => {
    const userId = await getUserId();
    if (!userId) return;

    const isCompleted = status === 'completed';
    const title = isCompleted ? `✓ ${jobName} completed` : `❌ ${jobName} failed`;
    const body = details || (isCompleted ? 'Finished successfully' : 'An error occurred');

    showToast('system', title, body);
    await notify(userId, { 
      type: 'system', 
      title, 
      body, 
      data: { jobName, status, action: `job_${status}` } 
    });
  }, [getUserId]);

  const notifyConnectivity = useCallback(async (isRestored: boolean) => {
    const title = isRestored ? '✓ Connection restored' : '⚠️ Connection lost';
    const body = isRestored 
      ? 'Your connection to Arlo has been restored' 
      : 'Unable to connect to Arlo. Trying to reconnect...';

    showToast('system', title, body);
    // Don't send push for connectivity - may not work if disconnected
  }, []);

  return {
    // Generic
    triggerNotification,
    // Chat
    notifyChatResponse,
    // Calendar
    notifyCalendarReminder,
    // Habits
    notifyHabitReminder,
    notifyStreakWarning,
    notifyStreakMilestone,
    // Tasks
    notifyTaskDueSoon,
    notifyTaskOverdue,
    notifyTaskCompleted,
    // Security
    notifySecurityEvent,
    notifyNewLogin,
    // System
    notifySystemEvent,
    notifyJobStatus,
    notifyConnectivity,
  };
}

import { useEffect, useRef, useCallback } from 'react';
import { notify, showToast, getCurrentUserId } from '@/lib/notifications/notify';
import { dataApiHelpers } from '@/lib/data-api';

interface DbTask {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  priority: number;
  due_date: string | null;
  category: string | null;
}

/**
 * Hook to monitor tasks and send notifications for:
 * - Due soon reminders (1 day, 1 hour before)
 * - Overdue task notifications
 * - Optional completion confirmations
 */
export function useTasksNotifications() {
  const firedNotificationsRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<number | null>(null);
  const lastCheckDateRef = useRef<string>('');

  const checkTaskNotifications = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data: tasks, error } = await dataApiHelpers.select<DbTask[]>('tasks', {
      filters: { done: false },
    });

    if (error || !tasks) return;

    const now = new Date();
    const today = now.toDateString();

    for (const task of tasks) {
      if (!task.due_date) continue;

      const dueDate = new Date(task.due_date);
      const timeDiff = dueDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      // 1. Due tomorrow notification (check once per day)
      if (daysDiff > 0 && daysDiff <= 1) {
        const dueTomorrowKey = `due-tomorrow-${task.id}-${today}`;
        if (!firedNotificationsRef.current.has(dueTomorrowKey)) {
          firedNotificationsRef.current.add(dueTomorrowKey);
          
          const title = '📋 Task due tomorrow';
          const body = `"${task.title}" is due tomorrow`;

          showToast('tasks', title, body);
          await notify(userId, {
            type: 'tasks',
            title,
            body,
            data: { taskId: task.id, action: 'due_soon' },
          });
        }
      }

      // 2. Due in 1 hour notification
      if (hoursDiff > 0 && hoursDiff <= 1) {
        const dueHourKey = `due-hour-${task.id}`;
        if (!firedNotificationsRef.current.has(dueHourKey)) {
          firedNotificationsRef.current.add(dueHourKey);
          
          const title = '⏰ Task due soon!';
          const body = `"${task.title}" is due in less than an hour`;

          showToast('tasks', title, body);
          await notify(userId, {
            type: 'tasks',
            title,
            body,
            data: { taskId: task.id, action: 'due_imminent' },
          });
        }
      }

      // 3. Overdue notification
      if (timeDiff < 0) {
        const overdueKey = `overdue-${task.id}-${today}`;
        if (!firedNotificationsRef.current.has(overdueKey)) {
          firedNotificationsRef.current.add(overdueKey);
          
          const hoursOverdue = Math.abs(hoursDiff);
          const daysOverdue = Math.floor(hoursOverdue / 24);
          
          let timeDesc = '';
          if (daysOverdue > 0) {
            timeDesc = `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
          } else {
            const hours = Math.floor(hoursOverdue);
            timeDesc = hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} overdue` : 'just became overdue';
          }

          const title = '🚨 Overdue task';
          const body = `"${task.title}" is ${timeDesc}`;

          showToast('tasks', title, body);
          await notify(userId, {
            type: 'tasks',
            title,
            body,
            data: { taskId: task.id, action: 'overdue', daysOverdue },
          });
        }
      }
    }

    // High priority task reminder at 9 AM
    const hour = now.getHours();
    if (hour >= 9 && hour < 10) {
      const highPriorityTasks = tasks.filter(t => t.priority >= 3 && !t.done);
      if (highPriorityTasks.length > 0) {
        const dailyHighPriorityKey = `high-priority-${today}`;
        if (!firedNotificationsRef.current.has(dailyHighPriorityKey)) {
          firedNotificationsRef.current.add(dailyHighPriorityKey);
          
          const title = '🎯 High priority tasks';
          const body = `You have ${highPriorityTasks.length} high priority task${highPriorityTasks.length > 1 ? 's' : ''} to complete`;

          showToast('tasks', title, body);
          await notify(userId, {
            type: 'tasks',
            title,
            body,
            data: { action: 'high_priority_summary', count: highPriorityTasks.length },
          });
        }
      }
    }

    // Clean up old fired notifications (reset daily keys at midnight)
    if (lastCheckDateRef.current !== today) {
      for (const key of firedNotificationsRef.current) {
        if (key.includes(lastCheckDateRef.current)) {
          firedNotificationsRef.current.delete(key);
        }
      }
      lastCheckDateRef.current = today;
    }
  }, []);

  // Set up interval to check every 15 minutes
  useEffect(() => {
    checkTaskNotifications();
    checkIntervalRef.current = window.setInterval(checkTaskNotifications, 15 * 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkTaskNotifications]);

  // Notify on task completion (optional confirmation)
  const notifyTaskCompleted = useCallback(async (taskTitle: string) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    showToast('tasks', '✓ Task completed', taskTitle);
    // Push notification is optional for completions - just show toast
  }, []);

  return { checkTaskNotifications, notifyTaskCompleted };
}

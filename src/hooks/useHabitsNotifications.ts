import { useEffect, useRef, useCallback } from 'react';
import { notify, showToast, getCurrentUserId } from '@/lib/notifications/notify';
import { dataApiHelpers } from '@/lib/data-api';
import type { HabitWithStreak, Routine } from '@/types/habits';

interface DbHabit {
  id: string;
  title: string;
  routine_id: string | null;
  schedule_type: string;
  schedule_days: number[];
  enabled: boolean;
}

interface DbRoutine {
  id: string;
  name: string;
  routine_type: string;
  start_time: string | null;
  trigger_type: string | null;
  reminder_enabled: boolean | null;
  reminder_type: string | null;
  reminder_minutes_before: number | null;
  enabled: boolean;
}

interface DbHabitLog {
  id: string;
  habit_id: string;
  completed_at: string;
  skipped: boolean;
}

const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365];

/**
 * Hook to monitor habits and send notifications for:
 * - Morning/night routine reminders
 * - Streak warnings (at risk)
 * - Streak milestone celebrations
 */
export function useHabitsNotifications() {
  const firedNotificationsRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<number | null>(null);
  const lastCheckDateRef = useRef<string>('');

  // Check if habit is scheduled for a specific day
  const isScheduledForDay = (habit: DbHabit, day: number): boolean => {
    switch (habit.schedule_type) {
      case 'daily':
        return true;
      case 'weekdays':
        return day >= 1 && day <= 5;
      case 'weekends':
        return day === 0 || day === 6;
      case 'custom':
      case 'weekly':
        return habit.schedule_days?.includes(day) ?? false;
      default:
        return true;
    }
  };

  // Calculate streak from logs
  const calculateStreak = (logs: DbHabitLog[]): number => {
    const completedLogs = logs.filter(l => !l.skipped);
    if (completedLogs.length === 0) return 0;

    const sortedLogs = completedLogs.sort(
      (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    for (const log of sortedLogs) {
      const logDate = new Date(log.completed_at);
      logDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0 || diffDays === 1) {
        streak++;
        currentDate = logDate;
      } else {
        break;
      }
    }

    return streak;
  };

  // Main check function
  const checkHabitNotifications = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const now = new Date();
    const today = now.toDateString();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Fetch habits, routines, and logs
    const [habitsRes, routinesRes, logsRes] = await Promise.all([
      dataApiHelpers.select<DbHabit[]>('habits', { filters: { enabled: true } }),
      dataApiHelpers.select<DbRoutine[]>('routines', { filters: { enabled: true } }),
      dataApiHelpers.select<DbHabitLog[]>('habit_logs', {
        order: { column: 'completed_at', ascending: false },
      }),
    ]);

    if (habitsRes.error || !habitsRes.data) return;

    const habits = habitsRes.data;
    const routines = routinesRes.data || [];
    const logs = logsRes.data || [];

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 1. Check each routine for reminder timing
    for (const routine of routines) {
      if (!routine.reminder_enabled) continue;
      
      // Skip if no start time (location/sunrise routines handled differently)
      const triggerType = routine.trigger_type ?? 'time';
      if (triggerType === 'location') continue; // Location triggers handled separately
      if (triggerType === 'sunrise' || triggerType === 'sunset') continue; // Sun-based handled separately
      
      if (!routine.start_time) continue;
      
      // Parse start time
      const [startHour, startMinute] = routine.start_time.split(':').map(Number);
      const reminderMinutesBefore = routine.reminder_minutes_before ?? 0;
      
      // Calculate reminder time
      const routineTime = new Date(now);
      routineTime.setHours(startHour, startMinute, 0, 0);
      const reminderTime = new Date(routineTime.getTime() - reminderMinutesBefore * 60 * 1000);
      
      // Check if we're in the reminder window (within 5 minutes)
      const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());
      const isInReminderWindow = timeDiff < 5 * 60 * 1000;
      
      if (isInReminderWindow) {
        const reminderKey = `routine-reminder-${routine.id}-${today}`;
        if (!firedNotificationsRef.current.has(reminderKey)) {
          const routineHabits = habits.filter(h => h.routine_id === routine.id);
          if (routineHabits.length > 0) {
            firedNotificationsRef.current.add(reminderKey);
            
            const emoji = routine.routine_type === 'morning' ? '☀️' : 
                         routine.routine_type === 'night' ? '🌙' : '✨';
            const timing = reminderMinutesBefore > 0 
              ? `in ${reminderMinutesBefore} minutes` 
              : 'now';
            
            showToast('habits', `${emoji} ${routine.name}`, `Starting ${timing}`);
            await notify(userId, {
              type: 'habits',
              title: `${emoji} ${routine.name}`,
              body: `Your routine starts ${timing} (${routineHabits.length} habits)`,
              data: { routineId: routine.id, routineType: routine.routine_type },
            });
          }
        }
      }
    }

    // 3. Streak warnings (check at 6 PM if habits not done)
    if (hour >= 18 && hour < 19) {
      for (const habit of habits) {
        if (!isScheduledForDay(habit, dayOfWeek)) continue;

        const habitLogs = logs.filter(l => l.habit_id === habit.id);
        const completedToday = habitLogs.some(log => {
          const logDate = new Date(log.completed_at);
          logDate.setHours(0, 0, 0, 0);
          return logDate.getTime() === todayStart.getTime() && !log.skipped;
        });

        if (!completedToday) {
          const streak = calculateStreak(habitLogs);
          
          // Only warn if there's a streak worth preserving (3+ days)
          if (streak >= 3) {
            const warningKey = `streak-warning-${habit.id}-${today}`;
            if (!firedNotificationsRef.current.has(warningKey)) {
              firedNotificationsRef.current.add(warningKey);
              
              const title = `🔥 ${streak}-day streak at risk!`;
              const body = `Don't lose your ${habit.title} streak - complete it before midnight`;

              showToast('habits', title, body);
              await notify(userId, {
                type: 'habits',
                title,
                body,
                data: { habitId: habit.id, streak, action: 'streak_warning' },
              });
            }
          }
        }
      }
    }

    // 4. Streak milestone notifications (check when logs are made)
    // This is triggered after habit completion
    for (const habit of habits) {
      const habitLogs = logs.filter(l => l.habit_id === habit.id);
      const streak = calculateStreak(habitLogs);

      if (STREAK_MILESTONES.includes(streak)) {
        const milestoneKey = `milestone-${habit.id}-${streak}`;
        if (!firedNotificationsRef.current.has(milestoneKey)) {
          // Check if the milestone was just achieved today
          const latestLog = habitLogs.find(l => !l.skipped);
          if (latestLog) {
            const logDate = new Date(latestLog.completed_at);
            logDate.setHours(0, 0, 0, 0);
            
            if (logDate.getTime() === todayStart.getTime()) {
              firedNotificationsRef.current.add(milestoneKey);
              
              const emoji = streak >= 100 ? '🏆' : streak >= 30 ? '🎉' : '⭐';
              const title = `${emoji} ${streak}-day streak!`;
              const body = `Amazing! You've completed ${habit.title} for ${streak} days in a row!`;

              showToast('habits', title, body);
              await notify(userId, {
                type: 'habits',
                title,
                body,
                data: { habitId: habit.id, streak, milestone: streak },
              });
            }
          }
        }
      }
    }

    // Clean up old fired notifications (reset at midnight)
    if (lastCheckDateRef.current !== today) {
      // Clear daily notifications but keep milestone ones
      for (const key of firedNotificationsRef.current) {
        if (!key.startsWith('milestone-')) {
          firedNotificationsRef.current.delete(key);
        }
      }
      lastCheckDateRef.current = today;
    }
  }, []);

  // Set up interval to check every 15 minutes
  useEffect(() => {
    checkHabitNotifications();
    checkIntervalRef.current = window.setInterval(checkHabitNotifications, 15 * 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkHabitNotifications]);

  // Expose method to manually trigger streak milestone check after completion
  const checkStreakMilestone = useCallback(async (habitId: string, habitTitle: string, newStreak: number) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    if (STREAK_MILESTONES.includes(newStreak)) {
      const milestoneKey = `milestone-${habitId}-${newStreak}`;
      if (!firedNotificationsRef.current.has(milestoneKey)) {
        firedNotificationsRef.current.add(milestoneKey);
        
        const emoji = newStreak >= 100 ? '🏆' : newStreak >= 30 ? '🎉' : '⭐';
        const title = `${emoji} ${newStreak}-day streak!`;
        const body = `Amazing! You've completed ${habitTitle} for ${newStreak} days in a row!`;

        showToast('habits', title, body);
        await notify(userId, {
          type: 'habits',
          title,
          body,
          data: { habitId, streak: newStreak, milestone: newStreak },
        });
      }
    }
  }, []);

  return { checkHabitNotifications, checkStreakMilestone };
}

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { dataApiHelpers } from '@/lib/data-api';

interface DashboardInsights {
  // Productivity
  pendingTasksCount: number;
  nextTask: string | null;
  tasksCompletedToday: number;
  
  // Habits
  habitsCompletedToday: number;
  totalHabitsToday: number;
  longestStreak: number;
  
  // Calendar
  nextEvent: { title: string; time: Date } | null;
  eventsToday: number;
  
  // Notes
  notesCount: number;
  lastNoteTitle: string | null;
  lastNoteUpdated: Date | null;
  
  // Finance
  monthlySpending: number;
  recentTransaction: { name: string; amount: number } | null;
  
  // Maps
  savedPlacesCount: number;
  
  // Loading state
  isLoading: boolean;
}

const DEFAULT_INSIGHTS: DashboardInsights = {
  pendingTasksCount: 0,
  nextTask: null,
  tasksCompletedToday: 0,
  habitsCompletedToday: 0,
  totalHabitsToday: 0,
  longestStreak: 0,
  nextEvent: null,
  eventsToday: 0,
  notesCount: 0,
  lastNoteTitle: null,
  lastNoteUpdated: null,
  monthlySpending: 0,
  recentTransaction: null,
  savedPlacesCount: 0,
  isLoading: true,
};

export function useDashboardData() {
  const [insights, setInsights] = useState<DashboardInsights>(DEFAULT_INSIGHTS);
  const { isAuthenticated } = useAuth();

  const fetchInsights = useCallback(async () => {
    if (!isAuthenticated) {
      setInsights({ ...DEFAULT_INSIGHTS, isLoading: false });
      return;
    }

    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch all data in parallel
      const [
        tasksResult,
        habitsResult,
        habitLogsResult,
        eventsResult,
        notesResult,
        transactionsResult,
      ] = await Promise.all([
        dataApiHelpers.select<{ id: string; title: string; done: boolean; priority: number }[]>('tasks', {
          order: { column: 'priority', ascending: false },
        }),
        dataApiHelpers.select<{ id: string; enabled: boolean; schedule_days: number[] | null }[]>('habits', {
          filters: { enabled: true },
        }),
        dataApiHelpers.select<{ habit_id: string; completed_at: string; skipped: boolean }[]>('habit_logs', {
          order: { column: 'completed_at', ascending: false },
        }),
        dataApiHelpers.select<{ id: string; title: string; start_time: string }[]>('calendar_events', {
          order: { column: 'start_time', ascending: true },
        }),
        dataApiHelpers.select<{ id: string; title: string; updated_at: string }[]>('notes', {
          order: { column: 'updated_at', ascending: false },
        }),
        dataApiHelpers.select<{ id: string; name: string; amount: number; date: string }[]>('finance_transactions', {
          order: { column: 'date', ascending: false },
        }),
      ]);

      const tasks = tasksResult.data || [];
      const habits = habitsResult.data || [];
      const habitLogs = habitLogsResult.data || [];
      const events = eventsResult.data || [];
      const notes = notesResult.data || [];
      const transactions = transactionsResult.data || [];

      // Process tasks
      const pendingTasks = tasks.filter(t => !t.done);
      const tasksCompletedToday = tasks.filter(t => t.done).length; // Simplified

      // Process habits
      const dayOfWeek = now.getDay();
      const todaysHabits = habits.filter(h => {
        if (!h.schedule_days || h.schedule_days.length === 0) return true;
        return h.schedule_days.includes(dayOfWeek);
      });
      
      const todayLogs = habitLogs.filter(log => {
        const logDate = new Date(log.completed_at);
        return logDate >= todayStart && logDate <= todayEnd && !log.skipped;
      });
      
      const completedHabitIds = new Set(todayLogs.map(l => l.habit_id));
      const habitsCompletedToday = todaysHabits.filter(h => completedHabitIds.has(h.id)).length;

      // Calculate streak (simplified - just count consecutive days with any completion)
      let longestStreak = 0;
      if (habitLogs.length > 0) {
        const logsByHabit = new Map<string, Set<string>>();
        habitLogs.forEach(log => {
          if (!log.skipped) {
            const dateStr = new Date(log.completed_at).toDateString();
            if (!logsByHabit.has(log.habit_id)) {
              logsByHabit.set(log.habit_id, new Set());
            }
            logsByHabit.get(log.habit_id)!.add(dateStr);
          }
        });
        
        logsByHabit.forEach((dates) => {
          const streak = dates.size;
          if (streak > longestStreak) longestStreak = streak;
        });
      }

      // Process calendar
      const upcomingEvents = events.filter(e => new Date(e.start_time) > now);
      const nextEvent = upcomingEvents.length > 0 
        ? { title: upcomingEvents[0].title, time: new Date(upcomingEvents[0].start_time) }
        : null;
      
      const eventsToday = events.filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate >= todayStart && eventDate <= todayEnd;
      }).length;

      // Process notes
      const lastNote = notes.length > 0 ? notes[0] : null;

      // Process transactions (this month)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthTransactions = transactions.filter(t => new Date(t.date) >= monthStart);
      const monthlySpending = thisMonthTransactions
        .filter(t => t.amount > 0) // Positive amounts are usually expenses in Plaid
        .reduce((sum, t) => sum + t.amount, 0);
      
      const recentTransaction = transactions.length > 0 
        ? { name: transactions[0].name, amount: transactions[0].amount }
        : null;

      setInsights({
        pendingTasksCount: pendingTasks.length,
        nextTask: pendingTasks.length > 0 ? pendingTasks[0].title : null,
        tasksCompletedToday,
        habitsCompletedToday,
        totalHabitsToday: todaysHabits.length,
        longestStreak,
        nextEvent,
        eventsToday,
        notesCount: notes.length,
        lastNoteTitle: lastNote?.title || null,
        lastNoteUpdated: lastNote ? new Date(lastNote.updated_at) : null,
        monthlySpending,
        recentTransaction,
        savedPlacesCount: 0, // Maps places would need separate query
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching dashboard insights:', error);
      setInsights({ ...DEFAULT_INSIGHTS, isLoading: false });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, refetch: fetchInsights };
}

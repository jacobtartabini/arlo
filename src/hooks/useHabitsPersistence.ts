import { dataApiHelpers } from "@/lib/data-api";
import type { Habit, HabitLog, HabitWithStreak } from "@/types/habits";

interface DbHabit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  category: string;
  habit_type: string;
  target_value: number;
  schedule_type: string;
  schedule_days: number[];
  weekly_frequency: number;
  difficulty: string;
  routine_id: string | null;
  routine_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface DbHabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  value: number;
  skipped: boolean;
  notes: string | null;
}

const dbToHabit = (db: DbHabit): Habit => ({
  id: db.id,
  title: db.title,
  description: db.description ?? undefined,
  icon: db.icon ?? 'check',
  category: db.category as Habit["category"],
  habitType: (db.habit_type ?? 'check') as Habit["habitType"],
  targetValue: db.target_value ?? 1,
  scheduleType: (db.schedule_type ?? 'daily') as Habit["scheduleType"],
  scheduleDays: db.schedule_days ?? [0, 1, 2, 3, 4, 5, 6],
  weeklyFrequency: db.weekly_frequency ?? 7,
  difficulty: (db.difficulty ?? 'normal') as Habit["difficulty"],
  routineId: db.routine_id ?? undefined,
  routineOrder: db.routine_order ?? 0,
  enabled: db.enabled,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

const dbToHabitLog = (db: DbHabitLog): HabitLog => ({
  id: db.id,
  habitId: db.habit_id,
  completedAt: new Date(db.completed_at),
  value: db.value ?? 1,
  skipped: db.skipped ?? false,
  notes: db.notes ?? undefined,
});

// Calculate streak from logs
const calculateStreak = (logs: HabitLog[]): number => {
  if (logs.length === 0) return 0;

  const sortedLogs = [...logs].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  for (const log of sortedLogs) {
    if (log.skipped) continue; // Skips don't break streaks
    
    const logDate = new Date(log.completedAt);
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

// Count completions in last 7 days
const countLast7Days = (logs: HabitLog[]): number => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return logs.filter(log => 
    !log.skipped && log.completedAt >= sevenDaysAgo
  ).length;
};

/**
 * Check if Tailscale is verified
 */
function isTailscaleVerified(): boolean {
  if (typeof window === 'undefined') return false;
  const verified = sessionStorage.getItem('arlo_access_verified') === 'true';
  const expiry = sessionStorage.getItem('arlo_access_verified_expiry');
  return verified && !!expiry && Date.now() < parseInt(expiry);
}

export function useHabitsPersistence() {
  const fetchHabits = async (): Promise<Habit[]> => {
    if (!isTailscaleVerified()) return [];

    const { data, error } = await dataApiHelpers.select<DbHabit[]>('habits', {
      order: { column: 'created_at', ascending: false },
    });

    if (error || !data) {
      console.error("Error fetching habits:", error);
      return [];
    }

    return data.map(dbToHabit);
  };

  const fetchHabitsWithStreaks = async (): Promise<HabitWithStreak[]> => {
    const habits = await fetchHabits();
    const logs = await fetchAllHabitLogs();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return habits.map((habit) => {
      const habitLogs = logs.filter((log) => log.habitId === habit.id);
      const streak = calculateStreak(habitLogs);
      const lastCompleted = habitLogs.find(l => !l.skipped)?.completedAt;
      const completedToday = habitLogs.some(log => {
        const logDate = new Date(log.completedAt);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime() && !log.skipped;
      });
      const last7Days = countLast7Days(habitLogs);

      return { ...habit, streak, lastCompleted, completedToday, last7Days };
    });
  };

  const fetchAllHabitLogs = async (): Promise<HabitLog[]> => {
    if (!isTailscaleVerified()) return [];

    const { data, error } = await dataApiHelpers.select<DbHabitLog[]>('habit_logs', {
      order: { column: 'completed_at', ascending: false },
    });

    if (error || !data) {
      console.error("Error fetching habit logs:", error);
      return [];
    }

    return data.map(dbToHabitLog);
  };

  const createHabit = async (
    title: string,
    description?: string,
    category: Habit["category"] = "routine"
  ): Promise<Habit | null> => {
    if (!isTailscaleVerified()) return null;

    const { data, error } = await dataApiHelpers.insert<DbHabit>('habits', {
      title,
      description: description ?? null,
      category,
    });

    if (error || !data) {
      console.error("Error creating habit:", error);
      return null;
    }

    return dbToHabit(data);
  };

  const updateHabit = async (
    id: string,
    updates: Partial<Omit<Habit, "id" | "createdAt" | "updatedAt">>
  ): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.habitType !== undefined) dbUpdates.habit_type = updates.habitType;
    if (updates.targetValue !== undefined) dbUpdates.target_value = updates.targetValue;
    if (updates.scheduleType !== undefined) dbUpdates.schedule_type = updates.scheduleType;
    if (updates.scheduleDays !== undefined) dbUpdates.schedule_days = updates.scheduleDays;
    if (updates.weeklyFrequency !== undefined) dbUpdates.weekly_frequency = updates.weeklyFrequency;
    if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
    if (updates.routineId !== undefined) dbUpdates.routine_id = updates.routineId;
    if (updates.routineOrder !== undefined) dbUpdates.routine_order = updates.routineOrder;

    const { error } = await dataApiHelpers.update('habits', id, dbUpdates);

    if (error) {
      console.error("Error updating habit:", error);
      return false;
    }

    return true;
  };

  const deleteHabit = async (id: string): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;

    const { error } = await dataApiHelpers.delete('habits', id);

    if (error) {
      console.error("Error deleting habit:", error);
      return false;
    }

    return true;
  };

  const logHabitCompletion = async (
    habitId: string,
    notes?: string
  ): Promise<HabitLog | null> => {
    if (!isTailscaleVerified()) return null;

    const { data, error } = await dataApiHelpers.insert<DbHabitLog>('habit_logs', {
      habit_id: habitId,
      notes: notes ?? null,
      value: 1,
      skipped: false,
    });

    if (error || !data) {
      console.error("Error logging habit completion:", error);
      return null;
    }

    return dbToHabitLog(data);
  };

  const deleteHabitLog = async (logId: string): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;

    const { error } = await dataApiHelpers.delete('habit_logs', logId);

    if (error) {
      console.error("Error deleting habit log:", error);
      return false;
    }

    return true;
  };

  return {
    fetchHabits,
    fetchHabitsWithStreaks,
    fetchAllHabitLogs,
    createHabit,
    updateHabit,
    deleteHabit,
    logHabitCompletion,
    deleteHabitLog,
  };
}

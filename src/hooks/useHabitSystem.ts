import { useState, useCallback } from "react";
import { dataApiHelpers } from "@/lib/data-api";
import type {
  Habit,
  HabitLog,
  HabitWithStreak,
  Routine,
  RoutineWithHabits,
  UserProgress,
  Reward,
  RewardRedemption,
  XpEvent,
  XP_VALUES,
  calculateLevel,
} from "@/types/habits";

// Check if Tailscale is verified
function isTailscaleVerified(): boolean {
  if (typeof window === 'undefined') return false;
  const verified = sessionStorage.getItem('arlo_access_verified') === 'true';
  const expiry = sessionStorage.getItem('arlo_access_verified_expiry');
  return verified && !!expiry && Date.now() < parseInt(expiry);
}

// Database interfaces
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

interface DbRoutine {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  routine_type: string;
  anchor_cue: string | null;
  reward_description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface DbUserProgress {
  id: string;
  user_id: string;
  total_xp: number;
  available_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

interface DbReward {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  xp_cost: number;
  icon: string;
  enabled: boolean;
  created_at: string;
}

interface DbXpEvent {
  id: string;
  user_id: string;
  event_type: string;
  xp_amount: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

// Converters
const dbToHabit = (db: DbHabit): Habit => ({
  id: db.id,
  title: db.title,
  description: db.description ?? undefined,
  icon: db.icon,
  category: db.category as Habit["category"],
  habitType: db.habit_type as Habit["habitType"],
  targetValue: db.target_value,
  scheduleType: db.schedule_type as Habit["scheduleType"],
  scheduleDays: db.schedule_days,
  weeklyFrequency: db.weekly_frequency,
  difficulty: db.difficulty as Habit["difficulty"],
  routineId: db.routine_id ?? undefined,
  routineOrder: db.routine_order,
  enabled: db.enabled,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

const dbToHabitLog = (db: DbHabitLog): HabitLog => ({
  id: db.id,
  habitId: db.habit_id,
  completedAt: new Date(db.completed_at),
  value: db.value,
  skipped: db.skipped,
  notes: db.notes ?? undefined,
});

const dbToRoutine = (db: DbRoutine): Routine => ({
  id: db.id,
  name: db.name,
  icon: db.icon,
  routineType: db.routine_type as Routine["routineType"],
  anchorCue: db.anchor_cue ?? undefined,
  rewardDescription: db.reward_description ?? undefined,
  enabled: db.enabled,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

const dbToUserProgress = (db: DbUserProgress): UserProgress => ({
  id: db.id,
  totalXp: db.total_xp,
  availableXp: db.available_xp,
  currentLevel: db.current_level,
  currentStreak: db.current_streak,
  longestStreak: db.longest_streak,
  lastActivityDate: db.last_activity_date ? new Date(db.last_activity_date) : undefined,
});

const dbToReward = (db: DbReward): Reward => ({
  id: db.id,
  name: db.name,
  description: db.description ?? undefined,
  xpCost: db.xp_cost,
  icon: db.icon,
  enabled: db.enabled,
  createdAt: new Date(db.created_at),
});

// Calculate streak considering skips don't break it
function calculateStreak(logs: HabitLog[], scheduleDays: number[]): number {
  if (logs.length === 0) return 0;

  const sortedLogs = [...logs].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  for (const log of sortedLogs) {
    if (log.skipped) continue; // Skips don't count but don't break

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
}

// Check if habit is scheduled for today
function isScheduledForToday(habit: Habit): boolean {
  const today = new Date().getDay();
  
  switch (habit.scheduleType) {
    case 'daily':
      return true;
    case 'weekdays':
      return today >= 1 && today <= 5;
    case 'weekends':
      return today === 0 || today === 6;
    case 'custom':
    case 'weekly':
      return habit.scheduleDays.includes(today);
    default:
      return true;
  }
}

// Count completions in last 7 days
function countLast7Days(logs: HabitLog[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return logs.filter(log => 
    !log.skipped && log.completedAt >= sevenDaysAgo
  ).length;
}

export function useHabitSystem() {
  const [loading, setLoading] = useState(false);

  // Fetch all habits with streaks
  const fetchHabitsWithStreaks = useCallback(async (): Promise<HabitWithStreak[]> => {
    if (!isTailscaleVerified()) return [];

    const [habitsRes, logsRes] = await Promise.all([
      dataApiHelpers.select<DbHabit[]>('habits', {
        order: { column: 'routine_order', ascending: true },
      }),
      dataApiHelpers.select<DbHabitLog[]>('habit_logs', {
        order: { column: 'completed_at', ascending: false },
      }),
    ]);

    if (habitsRes.error || !habitsRes.data) return [];

    const habits = habitsRes.data.map(dbToHabit);
    const logs = (logsRes.data || []).map(dbToHabitLog);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return habits.map((habit) => {
      const habitLogs = logs.filter((log) => log.habitId === habit.id);
      const streak = calculateStreak(habitLogs, habit.scheduleDays);
      const lastCompleted = habitLogs.find(l => !l.skipped)?.completedAt;
      const completedToday = habitLogs.some(log => {
        const logDate = new Date(log.completedAt);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime() && !log.skipped;
      });
      const last7Days = countLast7Days(habitLogs);

      return { ...habit, streak, lastCompleted, completedToday, last7Days };
    });
  }, []);

  // Fetch routines with their habits
  const fetchRoutinesWithHabits = useCallback(async (): Promise<RoutineWithHabits[]> => {
    if (!isTailscaleVerified()) return [];

    const [routinesRes, habitsWithStreaks] = await Promise.all([
      dataApiHelpers.select<DbRoutine[]>('routines', {
        order: { column: 'created_at', ascending: true },
      }),
      fetchHabitsWithStreaks(),
    ]);

    if (routinesRes.error || !routinesRes.data) return [];

    const routines = routinesRes.data.map(dbToRoutine);

    return routines.map(routine => {
      const habits = habitsWithStreaks
        .filter(h => h.routineId === routine.id && h.enabled)
        .sort((a, b) => a.routineOrder - b.routineOrder);
      
      const completedCount = habits.filter(h => h.completedToday).length;

      return {
        ...routine,
        habits,
        completedCount,
        totalCount: habits.length,
      };
    });
  }, [fetchHabitsWithStreaks]);

  // Fetch user progress
  const fetchUserProgress = useCallback(async (): Promise<UserProgress | null> => {
    if (!isTailscaleVerified()) return null;

    const { data, error } = await dataApiHelpers.select<DbUserProgress[]>('user_progress', {
      limit: 1,
    });

    if (error || !data || data.length === 0) {
      // Create initial progress
      const { data: newData } = await dataApiHelpers.insert<DbUserProgress>('user_progress', {});
      if (newData) return dbToUserProgress(newData);
      return null;
    }

    return dbToUserProgress(data[0]);
  }, []);

  // Fetch rewards
  const fetchRewards = useCallback(async (): Promise<Reward[]> => {
    if (!isTailscaleVerified()) return [];

    const { data, error } = await dataApiHelpers.select<DbReward[]>('rewards', {
      order: { column: 'xp_cost', ascending: true },
    });

    if (error || !data) return [];
    return data.map(dbToReward);
  }, []);

  // Create habit
  const createHabit = useCallback(async (habit: Partial<Habit>): Promise<Habit | null> => {
    if (!isTailscaleVerified()) return null;

    const { data, error } = await dataApiHelpers.insert<DbHabit>('habits', {
      title: habit.title,
      description: habit.description ?? null,
      icon: habit.icon ?? 'check',
      category: habit.category ?? 'routine',
      habit_type: habit.habitType ?? 'check',
      target_value: habit.targetValue ?? 1,
      schedule_type: habit.scheduleType ?? 'daily',
      schedule_days: habit.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6],
      weekly_frequency: habit.weeklyFrequency ?? 7,
      difficulty: habit.difficulty ?? 'normal',
      routine_id: habit.routineId ?? null,
      routine_order: habit.routineOrder ?? 0,
    });

    if (error || !data) return null;
    return dbToHabit(data);
  }, []);

  // Create routine
  const createRoutine = useCallback(async (routine: Partial<Routine>): Promise<Routine | null> => {
    if (!isTailscaleVerified()) return null;

    const { data, error } = await dataApiHelpers.insert<DbRoutine>('routines', {
      name: routine.name,
      icon: routine.icon ?? 'sun',
      routine_type: routine.routineType ?? 'custom',
      anchor_cue: routine.anchorCue ?? null,
      reward_description: routine.rewardDescription ?? null,
    });

    if (error || !data) return null;
    return dbToRoutine(data);
  }, []);

  // Log habit completion
  const logHabitCompletion = useCallback(async (
    habitId: string,
    value: number = 1,
    skipped: boolean = false,
    notes?: string
  ): Promise<{ log: HabitLog | null; xpEarned: number }> => {
    if (!isTailscaleVerified()) return { log: null, xpEarned: 0 };

    const { data, error } = await dataApiHelpers.insert<DbHabitLog>('habit_logs', {
      habit_id: habitId,
      value,
      skipped,
      notes: notes ?? null,
    });

    if (error || !data) return { log: null, xpEarned: 0 };

    // If skipped, no XP
    if (skipped) return { log: dbToHabitLog(data), xpEarned: 0 };

    // Calculate and award XP
    const [habitsRes, progressRes] = await Promise.all([
      dataApiHelpers.select<DbHabit[]>('habits', { filters: { id: habitId } }),
      dataApiHelpers.select<DbUserProgress[]>('user_progress', { limit: 1 }),
    ]);

    if (!habitsRes.data?.[0] || !progressRes.data?.[0]) {
      return { log: dbToHabitLog(data), xpEarned: 0 };
    }

    const habit = dbToHabit(habitsRes.data[0]);
    const progress = dbToUserProgress(progressRes.data[0]);

    let xpEarned = habit.difficulty === 'hard' ? 15 : 10;

    // Record XP event
    await dataApiHelpers.insert('xp_events', {
      event_type: 'habit_complete',
      xp_amount: xpEarned,
      description: `Completed: ${habit.title}`,
      reference_id: habitId,
    });

    // Update user progress
    await dataApiHelpers.update('user_progress', progress.id, {
      total_xp: progress.totalXp + xpEarned,
      available_xp: progress.availableXp + xpEarned,
    });

    return { log: dbToHabitLog(data), xpEarned };
  }, []);

  // Redeem reward
  const redeemReward = useCallback(async (rewardId: string): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;

    const [rewardRes, progressRes] = await Promise.all([
      dataApiHelpers.select<DbReward[]>('rewards', { filters: { id: rewardId } }),
      dataApiHelpers.select<DbUserProgress[]>('user_progress', { limit: 1 }),
    ]);

    if (!rewardRes.data?.[0] || !progressRes.data?.[0]) return false;

    const reward = dbToReward(rewardRes.data[0]);
    const progress = dbToUserProgress(progressRes.data[0]);

    if (progress.availableXp < reward.xpCost) return false;

    // Create redemption record
    await dataApiHelpers.insert('reward_redemptions', {
      reward_id: rewardId,
      xp_spent: reward.xpCost,
    });

    // Update available XP
    await dataApiHelpers.update('user_progress', progress.id, {
      available_xp: progress.availableXp - reward.xpCost,
    });

    return true;
  }, []);

  // Create reward
  const createReward = useCallback(async (reward: Partial<Reward>): Promise<Reward | null> => {
    if (!isTailscaleVerified()) return null;

    const { data, error } = await dataApiHelpers.insert<DbReward>('rewards', {
      name: reward.name,
      description: reward.description ?? null,
      xp_cost: reward.xpCost ?? 100,
      icon: reward.icon ?? 'gift',
    });

    if (error || !data) return null;
    return dbToReward(data);
  }, []);

  // Update habit
  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.habitType !== undefined) dbUpdates.habit_type = updates.habitType;
    if (updates.targetValue !== undefined) dbUpdates.target_value = updates.targetValue;
    if (updates.scheduleType !== undefined) dbUpdates.schedule_type = updates.scheduleType;
    if (updates.scheduleDays !== undefined) dbUpdates.schedule_days = updates.scheduleDays;
    if (updates.weeklyFrequency !== undefined) dbUpdates.weekly_frequency = updates.weeklyFrequency;
    if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
    if (updates.routineId !== undefined) dbUpdates.routine_id = updates.routineId;
    if (updates.routineOrder !== undefined) dbUpdates.routine_order = updates.routineOrder;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;

    const { error } = await dataApiHelpers.update('habits', id, dbUpdates);
    return !error;
  }, []);

  // Delete habit
  const deleteHabit = useCallback(async (id: string): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;
    const { error } = await dataApiHelpers.delete('habits', id);
    return !error;
  }, []);

  // Update routine
  const updateRoutine = useCallback(async (id: string, updates: Partial<Routine>): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.routineType !== undefined) dbUpdates.routine_type = updates.routineType;
    if (updates.anchorCue !== undefined) dbUpdates.anchor_cue = updates.anchorCue;
    if (updates.rewardDescription !== undefined) dbUpdates.reward_description = updates.rewardDescription;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;

    const { error } = await dataApiHelpers.update('routines', id, dbUpdates);
    return !error;
  }, []);

  // Delete routine
  const deleteRoutine = useCallback(async (id: string): Promise<boolean> => {
    if (!isTailscaleVerified()) return false;
    const { error } = await dataApiHelpers.delete('routines', id);
    return !error;
  }, []);

  return {
    loading,
    setLoading,
    fetchHabitsWithStreaks,
    fetchRoutinesWithHabits,
    fetchUserProgress,
    fetchRewards,
    createHabit,
    createRoutine,
    logHabitCompletion,
    redeemReward,
    createReward,
    updateHabit,
    deleteHabit,
    updateRoutine,
    deleteRoutine,
    isScheduledForToday,
  };
}

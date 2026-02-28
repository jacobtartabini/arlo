import { useState, useCallback, useRef } from "react";
import { dataApiHelpers } from "@/lib/data-api";
import type {
  Habit,
  HabitLog,
  HabitWithStreak,
  Routine,
  RoutineWithHabits,
  UserProgress,
  Reward,
  Difficulty,
} from "@/types/habits";
import { XP_VALUES, calculateLevel, getXpForDifficulty } from "@/types/habits";

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
  start_time: string | null;
  end_time: string | null;
  schedule_days: number[] | null;
  repeat_interval: number | null;
  repeat_unit: string | null;
  trigger_type: string | null;
  trigger_location_id: string | null;
  sunrise_offset_minutes: number | null;
  reminder_enabled: boolean | null;
  reminder_type: string | null;
  reminder_minutes_before: number | null;
  reminder_sound: string | null;
  reminder_vibrate: boolean | null;
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

// Converters
const dbToHabit = (db: DbHabit): Habit => ({
  id: db.id,
  title: db.title,
  description: db.description ?? undefined,
  icon: db.icon ?? 'check',
  category: (db.category ?? 'routine') as Habit["category"],
  habitType: (db.habit_type ?? 'check') as Habit["habitType"],
  targetValue: db.target_value ?? 1,
  durationMinutes: (db as any).duration_minutes ?? undefined,
  scheduleType: (db.schedule_type ?? 'daily') as Habit["scheduleType"],
  scheduleDays: db.schedule_days ?? [0, 1, 2, 3, 4, 5, 6],
  weeklyFrequency: db.weekly_frequency ?? 7,
  difficulty: (db.difficulty ?? 'medium') as Difficulty,
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

const dbToRoutine = (db: DbRoutine): Routine => ({
  id: db.id,
  name: db.name,
  icon: db.icon ?? 'flame',
  routineType: (db.routine_type ?? 'custom') as Routine["routineType"],
  anchorCue: db.anchor_cue ?? undefined,
  rewardDescription: db.reward_description ?? undefined,
  startTime: db.start_time ?? undefined,
  endTime: db.end_time ?? undefined,
  scheduleDays: db.schedule_days ?? [0, 1, 2, 3, 4, 5, 6],
  repeatInterval: db.repeat_interval ?? 1,
  repeatUnit: (db.repeat_unit ?? 'day') as Routine["repeatUnit"],
  triggerType: (db.trigger_type ?? 'time') as Routine["triggerType"],
  triggerLocationId: db.trigger_location_id ?? undefined,
  sunriseOffsetMinutes: db.sunrise_offset_minutes ?? 0,
  reminderEnabled: db.reminder_enabled ?? true,
  reminderType: (db.reminder_type ?? 'push') as Routine["reminderType"],
  reminderMinutesBefore: db.reminder_minutes_before ?? 0,
  reminderSound: db.reminder_sound ?? 'default',
  reminderVibrate: db.reminder_vibrate ?? true,
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
  icon: db.icon ?? 'gift',
  enabled: db.enabled,
  createdAt: new Date(db.created_at),
});

// Calculate streak using unique calendar days
function calculateStreak(logs: HabitLog[]): number {
  if (logs.length === 0) return 0;

  // Get unique completion dates (non-skipped)
  const uniqueDates = new Set<string>();
  for (const log of logs) {
    if (log.skipped) continue;
    const d = new Date(log.completedAt);
    uniqueDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  if (uniqueDates.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  // Streak must start from today or yesterday
  if (!uniqueDates.has(todayKey) && !uniqueDates.has(yesterdayKey)) {
    return 0;
  }

  let streak = 0;
  let checkDate = new Date(today);

  // If no activity today, start counting from yesterday
  if (!uniqueDates.has(todayKey)) {
    checkDate = new Date(yesterday);
  }

  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    if (uniqueDates.has(key)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Check if scheduled for today
export function isScheduledForToday(habit: Habit): boolean {
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

// Count last 7 days
function countLast7Days(logs: HabitLog[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return logs.filter(log => 
    !log.skipped && log.completedAt >= sevenDaysAgo
  ).length;
}

export interface HabitsState {
  habits: HabitWithStreak[];
  routines: RoutineWithHabits[];
  progress: UserProgress | null;
  rewards: Reward[];
  logs: HabitLog[];
  loading: boolean;
}

export interface CompletionResult {
  success: boolean;
  xpEarned: number;
  bonuses: string[];
}

export function useHabits() {
  const [state, setState] = useState<HabitsState>({
    habits: [],
    routines: [],
    progress: null,
    rewards: [],
    logs: [],
    loading: true,
  });

  // Prevent double-completion
  const completingRef = useRef<Set<string>>(new Set());
  // Cache for XP calculations
  const dataCache = useRef<{
    habits: Habit[];
    logs: HabitLog[];
    routines: Routine[];
  }>({ habits: [], logs: [], routines: [] });

  // Load all data
  const loadData = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));

    try {
      const [habitsRes, logsRes, routinesRes, progressRes, rewardsRes] = await Promise.all([
        dataApiHelpers.select<DbHabit[]>('habits', { order: { column: 'routine_order', ascending: true } }),
        dataApiHelpers.select<DbHabitLog[]>('habit_logs', { order: { column: 'completed_at', ascending: false } }),
        dataApiHelpers.select<DbRoutine[]>('routines', { order: { column: 'created_at', ascending: true } }),
        dataApiHelpers.select<DbUserProgress[]>('user_progress', { limit: 1 }),
        dataApiHelpers.select<DbReward[]>('rewards', { order: { column: 'xp_cost', ascending: true } }),
      ]);

      const habits = (habitsRes.data || []).map(dbToHabit);
      const logs = (logsRes.data || []).map(dbToHabitLog);
      const routines = (routinesRes.data || []).map(dbToRoutine);
      const rewards = (rewardsRes.data || []).map(dbToReward);

      // Cache for XP calculations
      dataCache.current = { habits, logs, routines };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build habits with streaks
      const habitsWithStreaks: HabitWithStreak[] = habits.map(habit => {
        const habitLogs = logs.filter(l => l.habitId === habit.id);
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

      // Build routines with habits
      const routinesWithHabits: RoutineWithHabits[] = routines.map(routine => {
        const routineHabits = habitsWithStreaks
          .filter(h => h.routineId === routine.id && h.enabled)
          .sort((a, b) => a.routineOrder - b.routineOrder);
        const completedCount = routineHabits.filter(h => h.completedToday).length;
        return {
          ...routine,
          habits: routineHabits,
          completedCount,
          totalCount: routineHabits.length,
        };
      });

      // Get or create progress
      let progress: UserProgress | null = null;
      if (progressRes.data && progressRes.data.length > 0) {
        progress = dbToUserProgress(progressRes.data[0]);
      } else {
        const { data } = await dataApiHelpers.insert<DbUserProgress>('user_progress', {});
        if (data) progress = dbToUserProgress(data);
      }

      setState({
        habits: habitsWithStreaks,
        routines: routinesWithHabits,
        progress,
        rewards,
        logs,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading habits data:', error);
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  // Complete a habit with optimistic updates
  const completeHabit = useCallback(async (
    habitId: string,
    skipped: boolean = false
  ): Promise<CompletionResult> => {
    // Prevent double-completion
    if (completingRef.current.has(habitId)) {
      return { success: false, xpEarned: 0, bonuses: [] };
    }
    completingRef.current.add(habitId);

    try {
      // Optimistic UI update
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      setState(s => ({
        ...s,
        habits: s.habits.map(h => 
          h.id === habitId 
            ? { ...h, completedToday: true, streak: h.streak + (skipped ? 0 : 1) }
            : h
        ),
        routines: s.routines.map(r => ({
          ...r,
          habits: r.habits.map(h => 
            h.id === habitId 
              ? { ...h, completedToday: true, streak: h.streak + (skipped ? 0 : 1) }
              : h
          ),
          completedCount: r.completedCount + (r.habits.some(h => h.id === habitId) ? 1 : 0),
        })),
      }));

      // Insert the log
      const { data, error } = await dataApiHelpers.insert<DbHabitLog>('habit_logs', {
        habit_id: habitId,
        value: 1,
        skipped,
        notes: null,
      });

      if (error || !data) {
        // Rollback optimistic update
        await loadData();
        return { success: false, xpEarned: 0, bonuses: [] };
      }

      if (skipped) {
        return { success: true, xpEarned: 0, bonuses: [] };
      }

      // Calculate XP (using cached data to avoid extra API calls)
      const habit = state.habits.find(h => h.id === habitId);
      if (!habit || !state.progress) {
        return { success: true, xpEarned: 0, bonuses: [] };
      }

      let xpEarned = 0;
      const bonuses: string[] = [];

      // Base XP
      const baseXp = getXpForDifficulty(habit.difficulty);
      xpEarned += baseXp;

      // Streak bonus (if had yesterday)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const hadYesterday = dataCache.current.logs.some(log => {
        if (log.habitId !== habitId || log.skipped) return false;
        const logDate = new Date(log.completedAt);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === yesterday.getTime();
      });

      if (hadYesterday) {
        xpEarned += XP_VALUES.STREAK_CONTINUE;
        bonuses.push(`+${XP_VALUES.STREAK_CONTINUE} streak`);
      }

      // Streak milestones
      const currentStreak = habit.streak + 1;
      if (currentStreak === 7) {
        xpEarned += XP_VALUES.STREAK_MILESTONE_7;
        bonuses.push('7-day milestone!');
      } else if (currentStreak === 14) {
        xpEarned += XP_VALUES.STREAK_MILESTONE_14;
        bonuses.push('14-day milestone!');
      } else if (currentStreak === 30) {
        xpEarned += XP_VALUES.STREAK_MILESTONE_30;
        bonuses.push('30-day milestone!');
      }

      // Routine completion bonus
      if (habit.routineId) {
        const routine = state.routines.find(r => r.id === habit.routineId);
        if (routine) {
          const completedAfterThis = routine.completedCount + 1;
          if (completedAfterThis === routine.totalCount && routine.totalCount > 0) {
            xpEarned += XP_VALUES.ROUTINE_COMPLETE;
            bonuses.push('Routine complete!');

            // Double routine bonus
            const otherType = routine.routineType === 'morning' ? 'night' : 'morning';
            const otherRoutine = state.routines.find(r => r.routineType === otherType);
            if (otherRoutine && otherRoutine.completedCount === otherRoutine.totalCount && otherRoutine.totalCount > 0) {
              xpEarned += XP_VALUES.DOUBLE_ROUTINE_BONUS;
              bonuses.push('Double routine day!');
            }
          }
        }
      }

      // Daily win check (80%+)
      const scheduledToday = state.habits.filter(h => h.enabled && isScheduledForToday(h));
      const completedBefore = scheduledToday.filter(h => h.completedToday && h.id !== habitId).length;
      const completedAfter = completedBefore + 1;
      const prevPercent = scheduledToday.length > 0 ? (completedBefore / scheduledToday.length) * 100 : 0;
      const newPercent = scheduledToday.length > 0 ? (completedAfter / scheduledToday.length) * 100 : 0;

      if (newPercent >= 80 && prevPercent < 80) {
        xpEarned += XP_VALUES.DAILY_WIN;
        bonuses.push('Daily Win!');
      }

      // Comeback bonus
      const hadAnyYesterday = dataCache.current.logs.some(log => {
        if (log.skipped) return false;
        const logDate = new Date(log.completedAt);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === yesterday.getTime();
      });
      const hadAnyTodayBefore = dataCache.current.logs.some(log => {
        if (log.skipped) return false;
        const logDate = new Date(log.completedAt);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
      });

      if (!hadAnyYesterday && !hadAnyTodayBefore) {
        xpEarned += XP_VALUES.COMEBACK;
        bonuses.push('Comeback!');
      }

      // Update progress optimistically
      if (xpEarned > 0 && state.progress) {
        const newTotalXp = state.progress.totalXp + xpEarned;
        const newLevel = calculateLevel(newTotalXp);

        setState(s => ({
          ...s,
          progress: s.progress ? {
            ...s.progress,
            totalXp: newTotalXp,
            availableXp: s.progress.availableXp + xpEarned,
            currentLevel: newLevel,
            currentStreak: Math.max(s.progress.currentStreak, currentStreak),
          } : null,
        }));

        // Background update to DB
        dataApiHelpers.update('user_progress', state.progress.id, {
          total_xp: newTotalXp,
          available_xp: state.progress.availableXp + xpEarned,
          current_level: newLevel,
          current_streak: Math.max(state.progress.currentStreak, currentStreak),
          longest_streak: Math.max(state.progress.longestStreak, currentStreak),
          last_activity_date: today.toISOString().split('T')[0],
        });

        // Record XP events in background
        dataApiHelpers.insert('xp_events', {
          event_type: 'habit_complete',
          xp_amount: xpEarned,
          description: `Completed: ${habit.title}`,
          reference_id: habitId,
        });
      }

      return { success: true, xpEarned, bonuses };
    } finally {
      completingRef.current.delete(habitId);
    }
  }, [state.habits, state.routines, state.progress, loadData]);

// Create habit
  const createHabit = useCallback(async (habit: Partial<Habit>): Promise<Habit | null> => {
    try {
      const { data, error } = await dataApiHelpers.insert<DbHabit>('habits', {
        title: habit.title,
        description: habit.description ?? null,
        icon: habit.icon ?? 'check',
        category: habit.category ?? 'routine',
        habit_type: habit.habitType ?? 'check',
        target_value: habit.targetValue ?? 1,
        duration_minutes: habit.durationMinutes ?? null,
        schedule_type: habit.scheduleType ?? 'daily',
        schedule_days: habit.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6],
        weekly_frequency: habit.weeklyFrequency ?? 7,
        difficulty: habit.difficulty ?? 'medium',
        routine_id: habit.routineId ?? null,
        routine_order: habit.routineOrder ?? 0,
      });

      if (error || !data) {
        console.error('[useHabits] Failed to create habit:', error);
        return null;
      }
      
      await loadData();
      return dbToHabit(data);
    } catch (err) {
      console.error('[useHabits] Create habit error:', err);
      return null;
    }
  }, [loadData]);

  // Create routine
  const createRoutine = useCallback(async (routine: Partial<Routine>): Promise<Routine | null> => {
    try {
      const { data, error } = await dataApiHelpers.insert<DbRoutine>('routines', {
        name: routine.name,
        icon: routine.icon ?? 'sun',
        routine_type: routine.routineType ?? 'custom',
        anchor_cue: routine.anchorCue ?? null,
        reward_description: routine.rewardDescription ?? null,
        start_time: routine.startTime ?? null,
        end_time: routine.endTime ?? null,
        schedule_days: routine.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6],
        repeat_interval: routine.repeatInterval ?? 1,
        repeat_unit: routine.repeatUnit ?? 'day',
        trigger_type: routine.triggerType ?? 'time',
        trigger_location_id: routine.triggerLocationId ?? null,
        sunrise_offset_minutes: routine.sunriseOffsetMinutes ?? 0,
        reminder_enabled: routine.reminderEnabled ?? true,
        reminder_type: routine.reminderType ?? 'push',
        reminder_minutes_before: routine.reminderMinutesBefore ?? 0,
        reminder_sound: routine.reminderSound ?? 'default',
        reminder_vibrate: routine.reminderVibrate ?? true,
      });

      if (error || !data) {
        console.error('[useHabits] Failed to create routine:', error);
        return null;
      }
      
      await loadData();
      return dbToRoutine(data);
    } catch (err) {
      console.error('[useHabits] Create routine error:', err);
      return null;
    }
  }, [loadData]);

  // Create reward
  const createReward = useCallback(async (reward: Partial<Reward>): Promise<Reward | null> => {
    try {
      const { data, error } = await dataApiHelpers.insert<DbReward>('rewards', {
        name: reward.name,
        description: reward.description ?? null,
        xp_cost: reward.xpCost ?? 100,
        icon: reward.icon ?? 'gift',
      });

      if (error || !data) {
        console.error('[useHabits] Failed to create reward:', error);
        return null;
      }
      
      await loadData();
      return dbToReward(data);
    } catch (err) {
      console.error('[useHabits] Create reward error:', err);
      return null;
    }
  }, [loadData]);

  // Redeem reward
  const redeemReward = useCallback(async (rewardId: string): Promise<boolean> => {
    if (!state.progress) return false;

    const reward = state.rewards.find(r => r.id === rewardId);
    if (!reward || state.progress.availableXp < reward.xpCost) return false;

    // Optimistic update
    setState(s => ({
      ...s,
      progress: s.progress ? {
        ...s.progress,
        availableXp: s.progress.availableXp - reward.xpCost,
      } : null,
    }));

    // Background DB updates
    await Promise.all([
      dataApiHelpers.insert('reward_redemptions', {
        reward_id: rewardId,
        xp_spent: reward.xpCost,
      }),
      dataApiHelpers.update('user_progress', state.progress.id, {
        available_xp: state.progress.availableXp - reward.xpCost,
      }),
    ]);

    return true;
  }, [state.progress, state.rewards]);

  // Reorder habits within a routine
  const reorderHabits = useCallback(async (routineId: string, habitIds: string[]): Promise<void> => {
    // Optimistic update
    setState(s => {
      const updatedRoutines = s.routines.map(r => {
        if (r.id !== routineId) return r;
        
        const reorderedHabits = habitIds.map((id, index) => {
          const habit = r.habits.find(h => h.id === id);
          return habit ? { ...habit, routineOrder: index } : null;
        }).filter(Boolean) as typeof r.habits;
        
        return { ...r, habits: reorderedHabits };
      });

      const updatedHabits = s.habits.map(h => {
        const newIndex = habitIds.indexOf(h.id);
        if (newIndex !== -1) {
          return { ...h, routineOrder: newIndex };
        }
        return h;
      });

      return { ...s, routines: updatedRoutines, habits: updatedHabits };
    });

    // Background DB updates
    try {
      await Promise.all(
        habitIds.map((id, index) => 
          dataApiHelpers.update('habits', id, { routine_order: index })
        )
      );
    } catch (err) {
      console.error('[useHabits] Failed to reorder habits:', err);
      await loadData(); // Revert on error
    }
  }, [loadData]);

  // Delete routine
  const deleteRoutine = useCallback(async (routineId: string): Promise<void> => {
    // Optimistic update
    setState(s => ({
      ...s,
      routines: s.routines.filter(r => r.id !== routineId),
      habits: s.habits.map(h => 
        h.routineId === routineId ? { ...h, routineId: undefined } : h
      ),
    }));

    try {
      // First unlink all habits from this routine
      const routineHabits = state.habits.filter(h => h.routineId === routineId);
      await Promise.all(
        routineHabits.map(h => 
          dataApiHelpers.update('habits', h.id, { routine_id: null, routine_order: 0 })
        )
      );

      // Then delete the routine
      await dataApiHelpers.delete('routines', routineId);
    } catch (err) {
      console.error('[useHabits] Failed to delete routine:', err);
      await loadData(); // Revert on error
    }
  }, [loadData, state.habits]);

  // Update habit
  const updateHabit = useCallback(async (habitId: string, updates: Partial<Habit>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description ?? null;
      if (updates.habitType !== undefined) dbUpdates.habit_type = updates.habitType;
      if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = updates.durationMinutes ?? null;
      if (updates.scheduleType !== undefined) dbUpdates.schedule_type = updates.scheduleType;
      if (updates.scheduleDays !== undefined) dbUpdates.schedule_days = updates.scheduleDays;
      if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
      if (updates.routineId !== undefined) dbUpdates.routine_id = updates.routineId ?? null;
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;

      const { error } = await dataApiHelpers.update('habits', habitId, dbUpdates);
      if (error) {
        console.error('[useHabits] Failed to update habit:', error);
        return false;
      }
      await loadData();
      return true;
    } catch (err) {
      console.error('[useHabits] Update habit error:', err);
      return false;
    }
  }, [loadData]);

  // Delete habit
  const deleteHabit = useCallback(async (habitId: string): Promise<boolean> => {
    // Optimistic update
    setState(s => ({
      ...s,
      habits: s.habits.filter(h => h.id !== habitId),
      routines: s.routines.map(r => ({
        ...r,
        habits: r.habits.filter(h => h.id !== habitId),
        totalCount: r.habits.filter(h => h.id !== habitId).length,
        completedCount: r.habits.filter(h => h.id !== habitId && h.completedToday).length,
      })),
    }));

    try {
      // Delete logs first, then habit
      await dataApiHelpers.delete('habits', habitId);
      return true;
    } catch (err) {
      console.error('[useHabits] Failed to delete habit:', err);
      await loadData();
      return false;
    }
  }, [loadData]);

  // Update routine
  const updateRoutine = useCallback(async (routineId: string, updates: Partial<Routine>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.routineType !== undefined) dbUpdates.routine_type = updates.routineType;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime ?? null;
      if (updates.scheduleDays !== undefined) dbUpdates.schedule_days = updates.scheduleDays;
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;

      const { error } = await dataApiHelpers.update('routines', routineId, dbUpdates);
      if (error) {
        console.error('[useHabits] Failed to update routine:', error);
        return false;
      }
      await loadData();
      return true;
    } catch (err) {
      console.error('[useHabits] Update routine error:', err);
      return false;
    }
  }, [loadData]);

  return {
    ...state,
    loadData,
    completeHabit,
    createHabit,
    createRoutine,
    createReward,
    redeemReward,
    reorderHabits,
    deleteRoutine,
    updateHabit,
    deleteHabit,
    updateRoutine,
    isScheduledForToday,
  };
}

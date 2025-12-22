import { supabase } from "@/integrations/supabase/client";
import type { Habit, HabitLog, HabitWithStreak } from "@/types/habits";

interface DbHabit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface DbHabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  notes: string | null;
}

const dbToHabit = (db: DbHabit): Habit => ({
  id: db.id,
  title: db.title,
  description: db.description ?? undefined,
  category: db.category as Habit["category"],
  enabled: db.enabled,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

const dbToHabitLog = (db: DbHabitLog): HabitLog => ({
  id: db.id,
  habitId: db.habit_id,
  completedAt: new Date(db.completed_at),
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

export function useHabitsPersistence() {
  const fetchHabits = async (): Promise<Habit[]> => {
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching habits:", error);
      return [];
    }

    return (data as DbHabit[]).map(dbToHabit);
  };

  const fetchHabitsWithStreaks = async (): Promise<HabitWithStreak[]> => {
    const habits = await fetchHabits();
    const logs = await fetchAllHabitLogs();

    return habits.map((habit) => {
      const habitLogs = logs.filter((log) => log.habitId === habit.id);
      const streak = calculateStreak(habitLogs);
      const lastCompleted = habitLogs.length > 0 
        ? habitLogs.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0].completedAt
        : undefined;

      return { ...habit, streak, lastCompleted };
    });
  };

  const fetchAllHabitLogs = async (): Promise<HabitLog[]> => {
    const { data, error } = await supabase
      .from("habit_logs")
      .select("*")
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("Error fetching habit logs:", error);
      return [];
    }

    return (data as DbHabitLog[]).map(dbToHabitLog);
  };

  const createHabit = async (
    title: string,
    description?: string,
    category: Habit["category"] = "routine"
  ): Promise<Habit | null> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: userData.user.id,
        title,
        description: description ?? null,
        category,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating habit:", error);
      return null;
    }

    return dbToHabit(data as DbHabit);
  };

  const updateHabit = async (
    id: string,
    updates: Partial<Omit<Habit, "id" | "createdAt" | "updatedAt">>
  ): Promise<boolean> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;

    const { error } = await supabase
      .from("habits")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Error updating habit:", error);
      return false;
    }

    return true;
  };

  const deleteHabit = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("habits").delete().eq("id", id);

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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from("habit_logs")
      .insert({
        habit_id: habitId,
        user_id: userData.user.id,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error logging habit completion:", error);
      return null;
    }

    return dbToHabitLog(data as DbHabitLog);
  };

  const deleteHabitLog = async (logId: string): Promise<boolean> => {
    const { error } = await supabase.from("habit_logs").delete().eq("id", logId);

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

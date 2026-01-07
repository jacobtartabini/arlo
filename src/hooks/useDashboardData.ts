/**
 * Hook for fetching dashboard module data
 * Provides real-time data for mini-interactions on module tiles
 */

import { useState, useEffect, useCallback } from "react";
import { dataApiHelpers } from "@/lib/data-api";
import { useAuth } from "@/providers/AuthProvider";
import { isToday, parseISO, startOfDay, isThisWeek } from "date-fns";

interface DashboardData {
  // Productivity/Today
  todayTasks: { id: string; title: string; done: boolean; priority: number }[];
  tasksCompletedToday: number;
  tasksDueToday: number;
  
  // Habits
  habitsCompletedToday: number;
  totalHabitsToday: number;
  currentStreak: number;
  totalXp: number;
  
  // Notes
  recentNotes: { id: string; title: string; updatedAt: Date }[];
  totalNotes: number;
  notesThisWeek: number;
  
  // Finance
  monthlySpending: number;
  monthlyBudget: number;
  recentTransactions: { id: string; name: string; amount: number }[];
  
  // Maps
  recentPlaces: { id: string; name: string; address?: string }[];
  savedPlacesCount: number;
  
  // Travel
  upcomingTrips: { id: string; name: string; startDate: Date }[];
  
  // Health (placeholder - uses static data for now)
  activityScore: number;
  sleepHours: number;
  
  isLoading: boolean;
}

const DEFAULT_DATA: DashboardData = {
  todayTasks: [],
  tasksCompletedToday: 0,
  tasksDueToday: 0,
  habitsCompletedToday: 0,
  totalHabitsToday: 0,
  currentStreak: 0,
  totalXp: 0,
  recentNotes: [],
  totalNotes: 0,
  notesThisWeek: 0,
  monthlySpending: 0,
  monthlyBudget: 5000,
  recentTransactions: [],
  recentPlaces: [],
  savedPlacesCount: 0,
  upcomingTrips: [],
  activityScore: 72,
  sleepHours: 7.5,
  isLoading: true,
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Fetch all data in parallel
      const [
        tasksResult,
        habitsResult,
        habitLogsResult,
        progressResult,
        notesResult,
        transactionsResult,
        placesResult,
        tripsResult,
      ] = await Promise.all([
        dataApiHelpers.select<any[]>("tasks", {
          order: { column: "priority", ascending: false },
        }),
        dataApiHelpers.select<any[]>("habits", {
          filters: { enabled: true },
        }),
        dataApiHelpers.select<any[]>("habit_logs", {
          order: { column: "completed_at", ascending: false },
        }),
        dataApiHelpers.select<any[]>("user_progress", {}),
        dataApiHelpers.select<any[]>("notes", {
          order: { column: "updated_at", ascending: false },
        }),
        dataApiHelpers.select<any[]>("finance_transactions", {
          order: { column: "date", ascending: false },
        }),
        dataApiHelpers.select<any[]>("map_recent_searches", {
          order: { column: "searched_at", ascending: false },
        }),
        dataApiHelpers.select<any[]>("trips", {
          order: { column: "start_date", ascending: true },
        }),
      ]);

      const today = startOfDay(new Date());
      const todayStr = today.toISOString().split("T")[0];

      // Process tasks
      const tasks = tasksResult.data || [];
      const todayTasks = tasks
        .filter((t: any) => !t.done && t.scheduled_date === todayStr)
        .slice(0, 3)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          done: t.done,
          priority: t.priority || 0,
        }));
      const tasksCompletedToday = tasks.filter(
        (t: any) => t.done && t.completed_at && isToday(parseISO(t.completed_at))
      ).length;
      const tasksDueToday = tasks.filter(
        (t: any) => !t.done && t.scheduled_date === todayStr
      ).length;

      // Process habits
      const habits = habitsResult.data || [];
      const habitLogs = habitLogsResult.data || [];
      const todayLogs = habitLogs.filter((log: any) =>
        isToday(parseISO(log.completed_at))
      );
      const habitsCompletedToday = new Set(todayLogs.map((l: any) => l.habit_id)).size;
      
      // Get progress
      const progress = progressResult.data?.[0];
      const currentStreak = progress?.current_streak || 0;
      const totalXp = progress?.total_xp || 0;

      // Process notes
      const notes = notesResult.data || [];
      const recentNotes = notes.slice(0, 3).map((n: any) => ({
        id: n.id,
        title: n.title || "Untitled",
        updatedAt: parseISO(n.updated_at),
      }));
      const notesThisWeek = notes.filter((n: any) =>
        isThisWeek(parseISO(n.created_at))
      ).length;

      // Process transactions
      const transactions = transactionsResult.data || [];
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const monthlyTransactions = transactions.filter((t: any) => {
        const date = parseISO(t.date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      });
      const monthlySpending = monthlyTransactions
        .filter((t: any) => t.amount < 0)
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
      const recentTransactions = transactions.slice(0, 3).map((t: any) => ({
        id: t.id,
        name: t.merchant_name || t.name,
        amount: t.amount,
      }));

      // Process places
      const places = placesResult.data || [];
      const recentPlaces = places.slice(0, 3).map((p: any) => ({
        id: p.id,
        name: p.place_name || p.query,
        address: p.place_address,
      }));

      // Process trips
      const trips = tripsResult.data || [];
      const upcomingTrips = trips
        .filter((t: any) => parseISO(t.start_date) > new Date())
        .slice(0, 2)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          startDate: parseISO(t.start_date),
        }));

      setData({
        todayTasks,
        tasksCompletedToday,
        tasksDueToday,
        habitsCompletedToday,
        totalHabitsToday: habits.length,
        currentStreak,
        totalXp,
        recentNotes,
        totalNotes: notes.length,
        notesThisWeek,
        monthlySpending,
        monthlyBudget: 5000, // Could be fetched from settings
        recentTransactions,
        recentPlaces,
        savedPlacesCount: places.length,
        upcomingTrips,
        activityScore: 72,
        sleepHours: 7.5,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refresh: fetchData };
}

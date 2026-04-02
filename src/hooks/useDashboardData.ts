/**
 * Hook for fetching dashboard module data
 * Provides real-time data for mini-interactions on module tiles
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { dataApiHelpers } from "@/lib/data-api";
import { useAuth } from "@/providers/AuthProvider";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { isToday, parseISO, startOfDay, isThisWeek } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { supabase } from "@/integrations/supabase/client";

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
  userLocation?: { lat: number; lng: number } | null;
  
  // Travel
  upcomingTrips: { id: string; name: string; startDate: Date }[];
  
  // Health (Strava summary; fall back to placeholders)
  healthConnected: boolean;
  activityScore: number; // 0-100 (derived)
  sleepHours: number; // placeholder until sleep integration exists
  healthRecentActivities: number;
  
  // Security
  connectedDevices: number;

  // Files (Drive summary)
  driveAccountsConnected: number;
  driveStorageUsedBytes: number | null;
  driveStorageTotalBytes: number | null;
  driveStorageUsedPercent: number | null;
  
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
  userLocation: null,
  upcomingTrips: [],
  healthConnected: false,
  activityScore: 72,
  sleepHours: 7.5,
  healthRecentActivities: 0,
  connectedDevices: 0,
  driveAccountsConnected: 0,
  driveStorageUsedBytes: null,
  driveStorageTotalBytes: null,
  driveStorageUsedPercent: null,
  isLoading: true,
};

type StravaStatusPayload = { connected: boolean };
type StravaStatsTotals = { count?: number };
type StravaStatsPayload = {
  stats?: {
    recent_runs?: StravaStatsTotals;
    recent_rides?: StravaStatsTotals;
    recent_swims?: StravaStatsTotals;
  };
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const { isAuthenticated } = useAuth();
  const { createTask, toggleTask } = useTasksPersistence();
  const refreshInFlightRef = useRef(false);

  // Get user location on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setData(prev => ({
          ...prev,
          userLocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        }));
      },
      (error) => {
        console.log("Geolocation error:", error.message);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

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
        driveAccountsResult,
        stravaStatusResult,
        stravaStatsResult,
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
        dataApiHelpers.select<any[]>("drive_accounts_safe", {}),
        invokeEdgeFunction<StravaStatusPayload>("strava-api", { action: "status" }, { requireAuth: true }),
        invokeEdgeFunction<StravaStatsPayload>("strava-api", { action: "stats" }, { requireAuth: true }),
      ]);

      const today = startOfDay(new Date());
      const todayStr = today.toISOString().split("T")[0];

      // Process tasks - get all tasks for today (both done and not done for display)
      const tasks = tasksResult.data || [];
      const todayScheduledTasks = tasks.filter(
        (t: any) => t.scheduled_date === todayStr
      );
      const todayTasks = todayScheduledTasks
        .slice(0, 6) // Show more tasks for interactivity
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          done: t.done,
          priority: t.priority || 0,
        }));
      const tasksCompletedToday = todayScheduledTasks.filter(
        (t: any) => t.done
      ).length;
      const tasksDueToday = todayScheduledTasks.filter(
        (t: any) => !t.done
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

      // Process Drive accounts (Files module)
      const driveAccounts = (driveAccountsResult.data || []) as Array<{
        enabled?: boolean;
        storage_quota_used?: number | null;
        storage_quota_total?: number | null;
      }>;
      const enabledDriveAccounts = driveAccounts.filter((a) => a.enabled !== false);
      const driveAccountsConnected = enabledDriveAccounts.length;
      const driveStorageUsedBytes = enabledDriveAccounts.some((a) => typeof a.storage_quota_used === "number")
        ? enabledDriveAccounts.reduce((sum, a) => sum + (a.storage_quota_used || 0), 0)
        : null;
      const driveStorageTotalBytes = enabledDriveAccounts.some((a) => typeof a.storage_quota_total === "number")
        ? enabledDriveAccounts.reduce((sum, a) => sum + (a.storage_quota_total || 0), 0)
        : null;
      const driveStorageUsedPercent =
        driveStorageUsedBytes !== null && driveStorageTotalBytes !== null && driveStorageTotalBytes > 0
          ? Math.round((driveStorageUsedBytes / driveStorageTotalBytes) * 100)
          : null;

      // Process Health (Strava summary)
      const healthConnected = Boolean(stravaStatusResult.ok && stravaStatusResult.data?.connected);
      const recentRuns = stravaStatsResult.ok ? (stravaStatsResult.data?.stats?.recent_runs?.count ?? 0) : 0;
      const recentRides = stravaStatsResult.ok ? (stravaStatsResult.data?.stats?.recent_rides?.count ?? 0) : 0;
      const recentSwims = stravaStatsResult.ok ? (stravaStatsResult.data?.stats?.recent_swims?.count ?? 0) : 0;
      const healthRecentActivities = healthConnected ? recentRuns + recentRides + recentSwims : 0;
      // Simple derived "activity score": 0..100 based on last ~4 weeks activity count.
      // This avoids hardcoding and still updates as Strava updates.
      const activityScore = healthConnected ? Math.min(100, Math.round((healthRecentActivities / 12) * 100)) : 0;

      setData(prev => ({
        ...prev,
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
        // Preserve geolocation result if it already resolved (avoid reverting to SF fallback)
        userLocation: prev.userLocation,
        upcomingTrips,
        healthConnected,
        healthRecentActivities,
        activityScore,
        sleepHours: prev.sleepHours,
        connectedDevices: 0, // Placeholder - could fetch from tailscale-api
        driveAccountsConnected,
        driveStorageUsedBytes,
        driveStorageTotalBytes,
        driveStorageUsedPercent,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setData(prev => ({ ...prev, isLoading: false }));
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep Files mini stats in sync with Drive account connect/disconnect updates.
  // Without this, the dashboard only fetches once on mount and won't reflect
  // newly connected storage accounts until a reload.
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel("dashboard-drive-accounts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drive_accounts" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, fetchData]);

  // Handler for toggling a task from the dashboard
  const handleTaskToggle = useCallback(async (taskId: string, done: boolean) => {
    // Optimistic update
    setData(prev => ({
      ...prev,
      todayTasks: prev.todayTasks.map(t => 
        t.id === taskId ? { ...t, done } : t
      ),
      tasksCompletedToday: prev.tasksCompletedToday + (done ? 1 : -1),
      tasksDueToday: prev.tasksDueToday + (done ? -1 : 1),
    }));

    const success = await toggleTask(taskId, done);
    if (!success) {
      // Revert on failure
      setData(prev => ({
        ...prev,
        todayTasks: prev.todayTasks.map(t => 
          t.id === taskId ? { ...t, done: !done } : t
        ),
        tasksCompletedToday: prev.tasksCompletedToday + (done ? -1 : 1),
        tasksDueToday: prev.tasksDueToday + (done ? 1 : -1),
      }));
    }
  }, [toggleTask]);

  // Handler for creating a task from the dashboard
  const handleTaskCreate = useCallback(async (title: string): Promise<boolean> => {
    const task = await createTask(title, {
      scheduledDate: new Date(),
      priority: 3,
      energyLevel: "medium",
    });

    if (task) {
      // Add the new task to the list
      setData(prev => ({
        ...prev,
        todayTasks: [
          { id: task.id, title: task.title, done: false, priority: task.priority },
          ...prev.todayTasks,
        ].slice(0, 6),
        tasksDueToday: prev.tasksDueToday + 1,
      }));
      toast({ title: "Task added", description: `"${title}" created` });
      return true;
    } else {
      toast({ title: "Failed to create task", variant: "destructive" });
      return false;
    }
  }, [createTask]);

  return { 
    ...data, 
    refresh: fetchData,
    onTaskToggle: handleTaskToggle,
    onTaskCreate: handleTaskCreate,
  };
}

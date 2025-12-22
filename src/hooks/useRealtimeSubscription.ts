import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type TableName = "tasks" | "habits" | "habit_logs" | "notifications";

interface UseRealtimeOptions<T> {
  table: TableName;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { id: string }) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T extends { id: string }>({
  table,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      switch (payload.eventType) {
        case "INSERT":
          onInsert?.(payload.new as T);
          break;
        case "UPDATE":
          onUpdate?.(payload.new as T);
          break;
        case "DELETE":
          onDelete?.(payload.old as { id: string });
          break;
      }
    },
    [onInsert, onUpdate, onDelete]
  );

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        handleChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, enabled, handleChange]);
}

// Hook for subscribing to multiple tables at once
export function useProductivityRealtime({
  onTaskChange,
  onHabitChange,
  onNotificationChange,
  enabled = true,
}: {
  onTaskChange?: () => void;
  onHabitChange?: () => void;
  onNotificationChange?: () => void;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("productivity-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => onTaskChange?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits" },
        () => onHabitChange?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_logs" },
        () => onHabitChange?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => onNotificationChange?.()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onTaskChange, onHabitChange, onNotificationChange]);
}

import { useEffect, useCallback, useRef } from "react";
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
  // Use refs to avoid re-subscribing when callbacks change
  const onTaskChangeRef = useRef(onTaskChange);
  const onHabitChangeRef = useRef(onHabitChange);
  const onNotificationChangeRef = useRef(onNotificationChange);

  // Update refs when callbacks change
  useEffect(() => {
    onTaskChangeRef.current = onTaskChange;
    onHabitChangeRef.current = onHabitChange;
    onNotificationChangeRef.current = onNotificationChange;
  });

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("productivity-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => onTaskChangeRef.current?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits" },
        () => onHabitChangeRef.current?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_logs" },
        () => onHabitChangeRef.current?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => onNotificationChangeRef.current?.()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}

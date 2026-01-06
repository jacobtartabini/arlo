import { useCallback } from "react";
import { dataApiHelpers } from "@/lib/data-api";
import type { TimeBlock, DbTimeBlock, BlockType } from "@/types/productivity";
import { dbToTimeBlock } from "@/types/productivity";
import { startOfDay, endOfDay } from "date-fns";

export function useTimeBlocksPersistence() {
  const fetchTimeBlocksForDate = useCallback(
    async (date: Date): Promise<TimeBlock[]> => {
      // Note: dataApiHelpers.select handles auth internally via getArloToken()

      const start = startOfDay(date).toISOString();
      const end = endOfDay(date).toISOString();

      // Note: For range queries we need a custom approach since dataApiHelpers doesn't support gte/lte
      // For now, fetch all and filter client-side (can be optimized with a dedicated backend function)
      const { data, error } = await dataApiHelpers.select<DbTimeBlock[]>("time_blocks", {
        order: { column: "start_time", ascending: true },
      });

      if (error || !data) {
        console.error("Error fetching time blocks:", error);
        return [];
      }

      // Filter to the specific date
      const filtered = data.filter((block) => {
        const blockStart = new Date(block.start_time);
        return blockStart >= new Date(start) && blockStart <= new Date(end);
      });

      return filtered.map(dbToTimeBlock);
    },
    []
  );

  const fetchTimeBlocksForTask = useCallback(
    async (taskId: string): Promise<TimeBlock[]> => {
      // Note: dataApiHelpers.select handles auth internally via getArloToken()

      const { data, error } = await dataApiHelpers.select<DbTimeBlock[]>("time_blocks", {
        filters: { task_id: taskId },
        order: { column: "start_time", ascending: true },
      });

      if (error || !data) {
        console.error("Error fetching time blocks for task:", error);
        return [];
      }

      return data.map(dbToTimeBlock);
    },
    []
  );

  const createTimeBlock = useCallback(
    async (
      startTime: Date,
      endTime: Date,
      options?: {
        taskId?: string;
        calendarEventId?: string;
        blockType?: BlockType;
        notes?: string;
      }
    ): Promise<TimeBlock | null> => {
      // Note: dataApiHelpers.insert handles auth internally via getArloToken()

      const { data, error } = await dataApiHelpers.insert<DbTimeBlock>("time_blocks", {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        task_id: options?.taskId ?? null,
        calendar_event_id: options?.calendarEventId ?? null,
        block_type: options?.blockType ?? "focus",
        notes: options?.notes ?? null,
      });

      if (error || !data) {
        console.error("Error creating time block:", error);
        return null;
      }

      return dbToTimeBlock(data);
    },
    []
  );

  const updateTimeBlock = useCallback(
    async (
      id: string,
      updates: Partial<Omit<TimeBlock, "id" | "createdAt" | "updatedAt">>
    ): Promise<boolean> => {
      // Note: dataApiHelpers.update handles auth internally via getArloToken()

      const dbUpdates: Record<string, unknown> = {};
      if (updates.taskId !== undefined) dbUpdates.task_id = updates.taskId;
      if (updates.calendarEventId !== undefined) dbUpdates.calendar_event_id = updates.calendarEventId;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime.toISOString();
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime.toISOString();
      if (updates.blockType !== undefined) dbUpdates.block_type = updates.blockType;
      if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
      if (updates.actualDurationMinutes !== undefined)
        dbUpdates.actual_duration_minutes = updates.actualDurationMinutes;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await dataApiHelpers.update("time_blocks", id, dbUpdates);

      if (error) {
        console.error("Error updating time block:", error);
        return false;
      }

      return true;
    },
    []
  );

  const deleteTimeBlock = useCallback(async (id: string): Promise<boolean> => {
    // Note: dataApiHelpers.delete handles auth internally via getArloToken()

    const { error } = await dataApiHelpers.delete("time_blocks", id);

    if (error) {
      console.error("Error deleting time block:", error);
      return false;
    }

    return true;
  }, []);

  const completeTimeBlock = useCallback(
    async (id: string, actualDurationMinutes?: number): Promise<boolean> => {
      return updateTimeBlock(id, {
        isCompleted: true,
        actualDurationMinutes,
      });
    },
    [updateTimeBlock]
  );

  return {
    fetchTimeBlocksForDate,
    fetchTimeBlocksForTask,
    createTimeBlock,
    updateTimeBlock,
    deleteTimeBlock,
    completeTimeBlock,
  };
}


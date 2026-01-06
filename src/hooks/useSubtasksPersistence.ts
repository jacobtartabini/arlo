import { useCallback } from "react";
import { dataApiHelpers } from "@/lib/data-api";
import { isAuthenticated } from "@/lib/arloAuth";
import type { Subtask, DbSubtask } from "@/types/productivity";
import { dbToSubtask } from "@/types/productivity";

export function useSubtasksPersistence() {
  const fetchSubtasksForTask = useCallback(async (taskId: string): Promise<Subtask[]> => {
    if (!isAuthenticated()) return [];

    const { data, error } = await dataApiHelpers.select<DbSubtask[]>("subtasks", {
      filters: { task_id: taskId },
      order: { column: "order_index", ascending: true },
    });

    if (error || !data) {
      console.error("Error fetching subtasks:", error);
      return [];
    }

    return data.map(dbToSubtask);
  }, []);

  const fetchSubtasksForTasks = useCallback(
    async (taskIds: string[]): Promise<Map<string, Subtask[]>> => {
      if (!isAuthenticated() || taskIds.length === 0) return new Map();

      const { data, error } = await dataApiHelpers.selectWithIn<DbSubtask[]>(
        "subtasks",
        "task_id",
        taskIds,
        { column: "order_index", ascending: true }
      );

      if (error || !data) {
        console.error("Error fetching subtasks:", error);
        return new Map();
      }

      const subtasksByTask = new Map<string, Subtask[]>();
      for (const db of data) {
        const subtask = dbToSubtask(db);
        const existing = subtasksByTask.get(subtask.taskId) || [];
        existing.push(subtask);
        subtasksByTask.set(subtask.taskId, existing);
      }

      return subtasksByTask;
    },
    []
  );

  const createSubtask = useCallback(
    async (taskId: string, title: string, orderIndex?: number): Promise<Subtask | null> => {
      if (!isAuthenticated()) return null;

      const { data, error } = await dataApiHelpers.insert<DbSubtask>("subtasks", {
        task_id: taskId,
        title,
        order_index: orderIndex ?? 0,
      });

      if (error || !data) {
        console.error("Error creating subtask:", error);
        return null;
      }

      return dbToSubtask(data);
    },
    []
  );

  const updateSubtask = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Subtask, "id" | "taskId" | "createdAt" | "updatedAt">>
    ): Promise<boolean> => {
      if (!isAuthenticated()) return false;

      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.done !== undefined) dbUpdates.done = updates.done;
      if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;

      const { error } = await dataApiHelpers.update("subtasks", id, dbUpdates);

      if (error) {
        console.error("Error updating subtask:", error);
        return false;
      }

      return true;
    },
    []
  );

  const deleteSubtask = useCallback(async (id: string): Promise<boolean> => {
    if (!isAuthenticated()) return false;

    const { error } = await dataApiHelpers.delete("subtasks", id);

    if (error) {
      console.error("Error deleting subtask:", error);
      return false;
    }

    return true;
  }, []);

  const toggleSubtask = useCallback(
    async (id: string, done: boolean): Promise<boolean> => {
      return updateSubtask(id, { done });
    },
    [updateSubtask]
  );

  const reorderSubtasks = useCallback(
    async (subtasks: { id: string; orderIndex: number }[]): Promise<boolean> => {
      if (!isAuthenticated()) return false;

      const results = await Promise.all(
        subtasks.map(({ id, orderIndex }) =>
          dataApiHelpers.update("subtasks", id, { order_index: orderIndex })
        )
      );

      return results.every((r) => !r.error);
    },
    []
  );

  return {
    fetchSubtasksForTask,
    fetchSubtasksForTasks,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtask,
    reorderSubtasks,
  };
}


import { useCallback } from "react";
import { dataApiHelpers } from "@/lib/data-api";
import { isAuthenticated } from "@/lib/arloAuth";
import type { Task, DbTask, EnergyLevel } from "@/types/productivity";
import { dbToTask } from "@/types/productivity";

export function useTasksPersistence() {
  const fetchTasks = useCallback(
    async (options?: {
      projectId?: string;
      scheduledDate?: Date;
      done?: boolean;
    }): Promise<Task[]> => {
      if (!isAuthenticated()) return [];

      const filters: Record<string, unknown> = {};
      if (options?.projectId) filters.project_id = options.projectId;
      if (options?.done !== undefined) filters.done = options.done;
      // Note: scheduledDate filtering happens client-side for now

      const { data, error } = await dataApiHelpers.select<DbTask[]>("tasks", {
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        order: { column: "priority", ascending: false },
      });

      if (error || !data) {
        console.error("Error fetching tasks:", error);
        return [];
      }

      let tasks = data.map(dbToTask);

      // Client-side filter for scheduled date if provided
      if (options?.scheduledDate) {
        const dateStr = options.scheduledDate.toISOString().split("T")[0];
        tasks = tasks.filter(
          (t) => t.scheduledDate?.toISOString().split("T")[0] === dateStr
        );
      }

      return tasks;
    },
    []
  );

  const fetchTasksForProject = useCallback(
    async (projectId: string): Promise<Task[]> => {
      return fetchTasks({ projectId });
    },
    [fetchTasks]
  );

  const fetchTodayTasks = useCallback(async (): Promise<Task[]> => {
    return fetchTasks({ scheduledDate: new Date() });
  }, [fetchTasks]);

  const createTask = useCallback(
    async (
      title: string,
      options?: {
        description?: string;
        category?: string;
        dueDate?: Date;
        projectId?: string;
        timeEstimateMinutes?: number;
        energyLevel?: EnergyLevel;
        scheduledDate?: Date;
        priority?: number;
      }
    ): Promise<Task | null> => {
      if (!isAuthenticated()) return null;

      const { data, error } = await dataApiHelpers.insert<DbTask>("tasks", {
        title,
        description: options?.description ?? null,
        category: options?.category ?? "general",
        due_date: options?.dueDate?.toISOString() ?? null,
        project_id: options?.projectId ?? null,
        time_estimate_minutes: options?.timeEstimateMinutes ?? null,
        energy_level: options?.energyLevel ?? "medium",
        scheduled_date: options?.scheduledDate?.toISOString().split("T")[0] ?? null,
        priority: options?.priority ?? 0,
      });

      if (error || !data) {
        console.error("Error creating task:", error);
        return null;
      }

      return dbToTask(data);
    },
    []
  );

  const updateTask = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>
    ): Promise<boolean> => {
      if (!isAuthenticated()) return false;

      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.done !== undefined) dbUpdates.done = updates.done;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate?.toISOString() ?? null;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId ?? null;
      if (updates.timeEstimateMinutes !== undefined)
        dbUpdates.time_estimate_minutes = updates.timeEstimateMinutes;
      if (updates.energyLevel !== undefined) dbUpdates.energy_level = updates.energyLevel;
      if (updates.scheduledDate !== undefined) {
        dbUpdates.scheduled_date = updates.scheduledDate?.toISOString().split("T")[0] ?? null;
      }
      if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;

      const { error } = await dataApiHelpers.update("tasks", id, dbUpdates);

      if (error) {
        console.error("Error updating task:", error);
        return false;
      }

      return true;
    },
    []
  );

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    if (!isAuthenticated()) return false;

    const { error } = await dataApiHelpers.delete("tasks", id);

    if (error) {
      console.error("Error deleting task:", error);
      return false;
    }

    return true;
  }, []);

  const toggleTask = useCallback(
    async (id: string, done: boolean): Promise<boolean> => {
      return updateTask(id, { done });
    },
    [updateTask]
  );

  const scheduleTask = useCallback(
    async (id: string, scheduledDate: Date | null): Promise<boolean> => {
      return updateTask(id, { scheduledDate: scheduledDate ?? undefined });
    },
    [updateTask]
  );

  const assignToProject = useCallback(
    async (id: string, projectId: string | null): Promise<boolean> => {
      return updateTask(id, { projectId: projectId ?? undefined });
    },
    [updateTask]
  );

  return {
    fetchTasks,
    fetchTasksForProject,
    fetchTodayTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    scheduleTask,
    assignToProject,
  };
}


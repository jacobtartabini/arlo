import { useCallback } from "react";
import { dataApiHelpers } from "@/lib/data-api";
import { isAuthenticated } from "@/lib/arloAuth";
import type { Project, DbProject, ProjectStatus, DbTask } from "@/types/productivity";
import { dbToProject as convertProject } from "@/types/productivity";

export function useProjectsPersistence() {
  const fetchProjects = useCallback(
    async (status?: ProjectStatus): Promise<Project[]> => {
      if (!isAuthenticated()) return [];

      const filters = status ? { status } : undefined;

      // Fetch projects and tasks in parallel (prevents 2x serial timeouts)
      const [{ data, error }, { data: tasksData }] = await Promise.all([
        dataApiHelpers.select<DbProject[]>("projects", {
          filters,
          order: { column: "updated_at", ascending: false },
        }),
        dataApiHelpers.select<DbTask[]>("tasks", {}),
      ]);

      if (error || !data) {
        console.error("Error fetching projects:", error);
        return [];
      }

      const projects = data.map(convertProject);

      if (tasksData) {
        const tasksByProject = tasksData.reduce(
          (acc, task) => {
            if (task.project_id) {
              if (!acc[task.project_id]) {
                acc[task.project_id] = { total: 0, completed: 0 };
              }
              acc[task.project_id].total++;
              if (task.done) acc[task.project_id].completed++;
            }
            return acc;
          },
          {} as Record<string, { total: number; completed: number }>
        );

        projects.forEach((project) => {
          const counts = tasksByProject[project.id];
          if (counts) {
            project.taskCount = counts.total;
            project.completedTaskCount = counts.completed;
            project.progress =
              counts.total > 0
                ? Math.round((counts.completed / counts.total) * 100)
                : 0;
          } else {
            project.taskCount = 0;
            project.completedTaskCount = 0;
            project.progress = 0;
          }
        });
      }

      return projects;
    },
    []
  );

  const fetchProject = useCallback(async (id: string): Promise<Project | null> => {
    if (!isAuthenticated()) return null;

    const { data, error } = await dataApiHelpers.select<DbProject[]>("projects", {
      filters: { id },
      limit: 1,
    });

    if (error || !data || data.length === 0) {
      console.error("Error fetching project:", error);
      return null;
    }

    const project = convertProject(data[0]);

    // Fetch task counts
    const { data: tasksData } = await dataApiHelpers.select<DbTask[]>("tasks", {
      filters: { project_id: id },
    });

    if (tasksData) {
      project.taskCount = tasksData.length;
      project.completedTaskCount = tasksData.filter((t) => t.done).length;
      project.progress =
        tasksData.length > 0
          ? Math.round((project.completedTaskCount / tasksData.length) * 100)
          : 0;
    }

    return project;
  }, []);

  const createProject = useCallback(
    async (
      name: string,
      options?: {
        description?: string;
        color?: string;
        icon?: string;
        startDate?: Date;
        targetDate?: Date;
      }
    ): Promise<Project | null> => {
      // Note: dataApiHelpers.insert handles auth internally via getArloToken()

      const { data, error } = await dataApiHelpers.insert<DbProject>("projects", {
        name,
        description: options?.description ?? null,
        color: options?.color ?? "#6366f1",
        icon: options?.icon ?? "folder",
        start_date: options?.startDate?.toISOString().split("T")[0] ?? null,
        target_date: options?.targetDate?.toISOString().split("T")[0] ?? null,
      });

      if (error || !data) {
        console.error("Error creating project:", error);
        return null;
      }

      const project = convertProject(data);
      project.taskCount = 0;
      project.completedTaskCount = 0;
      project.progress = 0;

      return project;
    },
    []
  );

  const updateProject = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>
    ): Promise<boolean> => {
      // Note: dataApiHelpers.update handles auth internally via getArloToken()

      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.startDate !== undefined) {
        dbUpdates.start_date = updates.startDate?.toISOString().split("T")[0] ?? null;
      }
      if (updates.targetDate !== undefined) {
        dbUpdates.target_date = updates.targetDate?.toISOString().split("T")[0] ?? null;
      }

      const { error } = await dataApiHelpers.update("projects", id, dbUpdates);

      if (error) {
        console.error("Error updating project:", error);
        return false;
      }

      return true;
    },
    []
  );

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    // Note: dataApiHelpers.delete handles auth internally via getArloToken()

    const { error } = await dataApiHelpers.delete("projects", id);

    if (error) {
      console.error("Error deleting project:", error);
      return false;
    }

    return true;
  }, []);

  const archiveProject = useCallback(
    async (id: string): Promise<boolean> => {
      return updateProject(id, { status: "archived" });
    },
    [updateProject]
  );

  return {
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
  };
}


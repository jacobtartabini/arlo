import { dataApiHelpers } from "@/lib/data-api";
import { isAuthenticated } from "@/lib/arloAuth";
import type { 
  Project, 
  DbProject, 
  ProjectStatus,
  dbToProject 
} from "@/types/productivity";
import { dbToProject as convertProject } from "@/types/productivity";

export function useProjectsPersistence() {
  const fetchProjects = async (status?: ProjectStatus): Promise<Project[]> => {
    if (!isAuthenticated()) return [];

    const filters = status ? { status } : undefined;
    const { data, error } = await dataApiHelpers.select<DbProject[]>('projects', {
      filters,
      order: { column: 'updated_at', ascending: false },
    });

    if (error || !data) {
      console.error("Error fetching projects:", error);
      return [];
    }

    return data.map(convertProject);
  };

  const fetchProject = async (id: string): Promise<Project | null> => {
    if (!isAuthenticated()) return null;

    const { data, error } = await dataApiHelpers.select<DbProject[]>('projects', {
      filters: { id },
      limit: 1,
    });

    if (error || !data || data.length === 0) {
      console.error("Error fetching project:", error);
      return null;
    }

    return convertProject(data[0]);
  };

  const createProject = async (
    name: string,
    options?: {
      description?: string;
      color?: string;
      icon?: string;
      startDate?: Date;
      targetDate?: Date;
    }
  ): Promise<Project | null> => {
    if (!isAuthenticated()) return null;

    const { data, error } = await dataApiHelpers.insert<DbProject>('projects', {
      name,
      description: options?.description ?? null,
      color: options?.color ?? '#6366f1',
      icon: options?.icon ?? 'folder',
      start_date: options?.startDate?.toISOString().split('T')[0] ?? null,
      target_date: options?.targetDate?.toISOString().split('T')[0] ?? null,
    });

    if (error || !data) {
      console.error("Error creating project:", error);
      return null;
    }

    return convertProject(data);
  };

  const updateProject = async (
    id: string,
    updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> => {
    if (!isAuthenticated()) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.startDate !== undefined) {
      dbUpdates.start_date = updates.startDate?.toISOString().split('T')[0] ?? null;
    }
    if (updates.targetDate !== undefined) {
      dbUpdates.target_date = updates.targetDate?.toISOString().split('T')[0] ?? null;
    }

    const { error } = await dataApiHelpers.update('projects', id, dbUpdates);

    if (error) {
      console.error("Error updating project:", error);
      return false;
    }

    return true;
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    if (!isAuthenticated()) return false;

    const { error } = await dataApiHelpers.delete('projects', id);

    if (error) {
      console.error("Error deleting project:", error);
      return false;
    }

    return true;
  };

  const archiveProject = async (id: string): Promise<boolean> => {
    return updateProject(id, { status: 'archived' });
  };

  return {
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
  };
}

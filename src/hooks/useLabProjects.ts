import { useState, useEffect, useCallback } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import type { CreationProject, LabProjectStatus } from '@/types/creation';

const getUserId = (): string => {
  const userId = sessionStorage.getItem('arlo_user_id');
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
};

function normalizeProject(row: CreationProject): CreationProject {
  return {
    ...row,
    description: row.description ?? '',
    status: (row.status as LabProjectStatus) || 'in_progress',
  };
}

export function useLabProjects() {
  const [projects, setProjects] = useState<CreationProject[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dataApiHelpers.select<CreationProject[]>('creation_projects', {
        order: { column: 'updated_at', ascending: false },
      });
      setProjects((res.data ?? []).map(normalizeProject));
    } catch (e) {
      console.error('useLabProjects refresh:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProject = useCallback(
    async (name: string, opts?: { description?: string; status?: LabProjectStatus }) => {
      const res = await dataApiHelpers.insert<CreationProject>('creation_projects', {
        name: name.trim() || 'Untitled project',
        description: opts?.description?.trim() ?? '',
        status: opts?.status ?? 'in_progress',
        user_id: getUserId(),
      });
      if (res.data) {
        await refresh();
        return normalizeProject(res.data as CreationProject);
      }
      return null;
    },
    [refresh]
  );

  const updateProject = useCallback(
    async (
      id: string,
      patch: Partial<Pick<CreationProject, 'name' | 'description' | 'status'>>
    ) => {
      await dataApiHelpers.update('creation_projects', id, patch as Record<string, unknown>);
      await refresh();
    },
    [refresh]
  );

  const touchProject = useCallback(
    async (id: string) => {
      await dataApiHelpers.update('creation_projects', id, {
        updated_at: new Date().toISOString(),
      });
      await refresh();
    },
    [refresh]
  );

  return { projects, loading, refresh, createProject, updateProject, touchProject };
}

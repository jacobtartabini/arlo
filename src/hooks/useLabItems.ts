import { useState, useEffect, useCallback } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import { getUserKey } from '@/lib/arloAuth';
import { storageUpload, storageGetSignedUrl, storageDelete } from '@/lib/storage-proxy';
import type { LabItem, LabItemType } from '@/types/creation';
import { toast } from 'sonner';

function normalizeItem(row: LabItem): LabItem {
  const meta = row.metadata;
  return {
    ...row,
    body: row.body ?? null,
    file_path: row.file_path ?? null,
    original_filename: row.original_filename ?? null,
    metadata:
      meta && typeof meta === 'object' && !Array.isArray(meta)
        ? (meta as Record<string, unknown>)
        : {},
  };
}

export function useLabItems(projectId: string | undefined) {
  const [items, setItems] = useState<LabItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await dataApiHelpers.select<LabItem[]>('lab_items', {
        filters: { project_id: projectId },
        order: { column: 'updated_at', ascending: false },
      });
      setItems((res.data ?? []).map((r) => normalizeItem(r as LabItem)));
    } catch (e) {
      console.error('useLabItems refresh:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTextItem = useCallback(
    async (itemType: LabItemType, title: string, body: string) => {
      if (!projectId) return null;
      const res = await dataApiHelpers.insert<LabItem>('lab_items', {
        project_id: projectId,
        item_type: itemType,
        title: title.trim() || 'Untitled',
        body: body.trim() || null,
      });
      if (res.data) {
        await refresh();
        return normalizeItem(res.data as LabItem);
      }
      toast.error('Could not add item');
      return null;
    },
    [projectId, refresh]
  );

  const addFileItem = useCallback(
    async (itemType: 'media' | 'file', file: File, title?: string) => {
      if (!projectId) return null;
      const userKey = getUserKey();
      if (!userKey) {
        toast.error('Not authenticated');
        return null;
      }
      const filePath = `${userKey}/${projectId}/lab/${Date.now()}_${file.name}`;
      const uploadResult = await storageUpload('creation-assets', filePath, file);
      if (!uploadResult) {
        toast.error('Upload failed');
        return null;
      }
      const res = await dataApiHelpers.insert<LabItem>('lab_items', {
        project_id: projectId,
        item_type: itemType,
        title: (title?.trim() || file.name).slice(0, 500),
        body: null,
        file_path: filePath,
        original_filename: file.name,
      });
      if (res.data) {
        await refresh();
        return normalizeItem(res.data as LabItem);
      }
      toast.error('Could not save file reference');
      return null;
    },
    [projectId, refresh]
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<Pick<LabItem, 'title' | 'body' | 'metadata'>>) => {
      await dataApiHelpers.update('lab_items', id, patch as Record<string, unknown>);
      await refresh();
    },
    [refresh]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const row = items.find((i) => i.id === id);
      if (row?.file_path) {
        await storageDelete('creation-assets', [row.file_path]);
      }
      await dataApiHelpers.delete('lab_items', id);
      await refresh();
    },
    [items, refresh]
  );

  const getFileUrl = useCallback(async (filePath: string): Promise<string | null> => {
    return storageGetSignedUrl('creation-assets', filePath);
  }, []);

  return {
    items,
    loading,
    refresh,
    addTextItem,
    addFileItem,
    updateItem,
    deleteItem,
    getFilePublicUrl,
  };
}

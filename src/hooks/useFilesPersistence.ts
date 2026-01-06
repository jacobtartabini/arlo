import { useState, useCallback } from 'react';
import { getAuthHeaders } from '@/lib/arloAuth';
import type { DriveAccount, DriveFile, DriveFileLink, FileTypeFilter } from '@/types/files';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useFilesPersistence() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Call edge function helper
  const callEdgeFunction = useCallback(async (functionName: string, body: Record<string, unknown>) => {
    const headers = await getAuthHeaders();
    if (!headers) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || err.message || 'Request failed');
    }

    return response.json();
  }, []);

  // Get OAuth URL for connecting a new account
  const getAuthUrl = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callEdgeFunction('drive-auth', { action: 'get_auth_url' });
      return data.oauth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get auth URL');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  // List connected accounts
  const listAccounts = useCallback(async (): Promise<DriveAccount[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callEdgeFunction('drive-auth', { action: 'list_accounts' });
      return data.accounts || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list accounts');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  // Disconnect an account
  const disconnectAccount = useCallback(async (accountId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await callEdgeFunction('drive-auth', { action: 'disconnect', accountId });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  // List/search files from a specific account
  const listFiles = useCallback(async (
    accountId: string,
    options?: {
      query?: string;
      pageToken?: string;
      folderId?: string;
      mimeType?: FileTypeFilter;
    }
  ): Promise<{ files: DriveFile[]; nextPageToken?: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callEdgeFunction('drive-api', {
        action: options?.query ? 'search_files' : 'list_files',
        accountId,
        query: options?.query,
        pageToken: options?.pageToken,
        folderId: options?.folderId,
        mimeType: options?.mimeType === 'all' ? undefined : options?.mimeType,
      });
      return { files: data.files || [], nextPageToken: data.nextPageToken };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list files');
      return { files: [] };
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  // Search files across all accounts
  const searchAllFiles = useCallback(async (
    accounts: DriveAccount[],
    query: string,
    mimeType?: FileTypeFilter
  ): Promise<DriveFile[]> => {
    if (!query.trim() || accounts.length === 0) return [];

    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        accounts.map(account =>
          callEdgeFunction('drive-api', {
            action: 'search_files',
            accountId: account.id,
            query,
            mimeType: mimeType === 'all' ? undefined : mimeType,
          }).catch(() => ({ files: [] }))
        )
      );
      return results.flatMap(r => r.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search files');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  // Sync files from an account
  const syncFiles = useCallback(async (accountId: string): Promise<number> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callEdgeFunction('drive-api', { action: 'sync_files', accountId });
      return data.synced || 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync files');
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  // Link a file to an entity (project, task, trip, event)
  const linkFile = useCallback(async (
    accountId: string,
    driveFileId: string,
    linkType: 'project' | 'task' | 'trip' | 'event',
    linkedEntityId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await callEdgeFunction('drive-api', {
        action: 'link_file',
        accountId,
        driveFileId,
        linkType,
        linkedEntityId,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link file');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  // Unlink a file from an entity
  const unlinkFile = useCallback(async (
    fileId: string,
    linkType: 'project' | 'task' | 'trip' | 'event',
    linkedEntityId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await callEdgeFunction('drive-api', {
        action: 'unlink_file',
        fileId,
        linkType,
        linkedEntityId,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink file');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  // Get files linked to an entity
  const getLinkedFiles = useCallback(async (
    linkType: 'project' | 'task' | 'trip' | 'event',
    linkedEntityId: string
  ): Promise<DriveFileLink[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callEdgeFunction('drive-api', {
        action: 'get_links',
        linkType,
        linkedEntityId,
      });
      return data.links || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get linked files');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  return {
    isLoading,
    error,
    getAuthUrl,
    listAccounts,
    disconnectAccount,
    listFiles,
    searchAllFiles,
    syncFiles,
    linkFile,
    unlinkFile,
    getLinkedFiles,
  };
}

import { useState, useCallback } from 'react';
import { getAuthHeaders } from '@/lib/arloAuth';
import type { DriveAccount, DriveFile, DriveFileLink, FileTypeFilter, DriveSection, SharedDrive } from '@/types/files';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ─── Drive accounts localStorage cache ───────────────────────────────────────
// Persists connected account metadata (never tokens) so the Files page and
// dashboard can render connected state immediately on the next visit without
// waiting for the edge-function round-trip.

const DRIVE_ACCOUNTS_CACHE_KEY = 'arlo_drive_accounts_cache';

interface DriveAccountsCache {
  accounts: DriveAccount[];
  cachedAt: string;
}

export function getCachedDriveAccounts(): DriveAccount[] {
  try {
    const raw = localStorage.getItem(DRIVE_ACCOUNTS_CACHE_KEY);
    if (!raw) return [];
    const parsed: DriveAccountsCache = JSON.parse(raw);
    return Array.isArray(parsed.accounts) ? parsed.accounts : [];
  } catch {
    return [];
  }
}

function setCachedDriveAccounts(accounts: DriveAccount[]): void {
  try {
    const cache: DriveAccountsCache = { accounts, cachedAt: new Date().toISOString() };
    localStorage.setItem(DRIVE_ACCOUNTS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota / SSR errors
  }
}

export function clearCachedDriveAccounts(): void {
  try {
    localStorage.removeItem(DRIVE_ACCOUNTS_CACHE_KEY);
  } catch {
    // ignore
  }
}

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
      const accounts: DriveAccount[] = data.accounts || [];
      setCachedDriveAccounts(accounts);
      return accounts;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list accounts');
      // Return the last-known accounts from cache so the UI stays functional
      return getCachedDriveAccounts();
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
      // Evict disconnected account from cache immediately
      const remaining = getCachedDriveAccounts().filter(a => a.id !== accountId);
      setCachedDriveAccounts(remaining);
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
      driveSection?: DriveSection;
      sharedDriveId?: string;
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
        driveSection: options?.driveSection,
        sharedDriveId: options?.sharedDriveId,
      });
      return { files: data.files || [], nextPageToken: data.nextPageToken };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list files');
      return { files: [] };
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction]);

  // List shared drives for an account
  const listSharedDrives = useCallback(async (accountId: string): Promise<SharedDrive[]> => {
    try {
      const data = await callEdgeFunction('drive-api', { action: 'list_shared_drives', accountId });
      return data.sharedDrives || [];
    } catch (err) {
      console.error('Failed to list shared drives:', err);
      return [];
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

  // Get links for specific files (to display linked entity badges)
  const getFileLinks = useCallback(async (
    driveFileIds: string[]
  ): Promise<Array<{ drive_file_id_external: string; link_type: string; linked_entity_id: string }>> => {
    if (driveFileIds.length === 0) return [];
    
    try {
      const data = await callEdgeFunction('drive-api', {
        action: 'get_file_links',
        driveFileIds,
      });
      return data.links || [];
    } catch (err) {
      console.error('Failed to get file links:', err);
      return [];
    }
  }, [callEdgeFunction]);

  return {
    isLoading,
    error,
    getAuthUrl,
    listAccounts,
    disconnectAccount,
    listFiles,
    listSharedDrives,
    searchAllFiles,
    syncFiles,
    linkFile,
    unlinkFile,
    getLinkedFiles,
    getFileLinks,
  };
}

import { useCallback } from 'react';
import { notifySystem, showToast, getCurrentUserId } from '@/lib/notifications/notify';

type JobType = 'sync' | 'import' | 'export' | 'backup' | 'update' | 'cleanup';
type JobStatus = 'started' | 'completed' | 'failed';

interface JobInfo {
  type: JobType;
  name: string;
  details?: string;
}

/**
 * Hook for system-level notifications:
 * - Background job status (sync, import, export, backup)
 * - System errors and failures
 */
export function useSystemNotifications() {
  // Notify background job status
  const notifyJobStatus = useCallback(async (job: JobInfo, status: JobStatus, error?: string) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const icons: Record<JobType, string> = {
      sync: '🔄',
      import: '📥',
      export: '📤',
      backup: '💾',
      update: '⬆️',
      cleanup: '🧹',
    };

    const icon = icons[job.type] || '⚙️';

    switch (status) {
      case 'started': {
        const title = `${icon} ${job.name} started`;
        const body = job.details || `Running ${job.type} in the background...`;
        showToast('system', title, body);
        // Don't send push for 'started' to reduce noise
        break;
      }

      case 'completed': {
        const title = `${icon} ${job.name} completed`;
        const body = job.details || `${job.type} finished successfully`;
        showToast('system', title, body);
        await notifySystem(userId, title, body, {
          action: 'job_completed',
          jobType: job.type,
          jobName: job.name,
        });
        break;
      }

      case 'failed': {
        const title = `❌ ${job.name} failed`;
        const body = error || `${job.type} encountered an error`;
        showToast('system', title, body);
        await notifySystem(userId, title, body, {
          action: 'job_failed',
          jobType: job.type,
          jobName: job.name,
          error,
        });
        break;
      }
    }
  }, []);

  // Notify system error
  const notifySystemError = useCallback(async (
    errorType: string,
    message: string,
    details?: Record<string, unknown>
  ) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const title = `⚠️ System Error: ${errorType}`;
    const body = message;

    showToast('system', title, body);
    await notifySystem(userId, title, body, {
      action: 'system_error',
      errorType,
      ...details,
    });
  }, []);

  // Notify connectivity issues
  const notifyConnectivityIssue = useCallback(async (isRestored: boolean) => {
    const userId = await getCurrentUserId();
    
    if (isRestored) {
      const title = '✓ Connection restored';
      const body = 'Your connection to Arlo has been restored';
      showToast('system', title, body);
      
      if (userId) {
        await notifySystem(userId, title, body, {
          action: 'connection_restored',
        });
      }
    } else {
      const title = '⚠️ Connection lost';
      const body = 'Unable to connect to Arlo. Trying to reconnect...';
      showToast('system', title, body);
      // Don't send push for connection lost - it might not work anyway
    }
  }, []);

  // Notify data sync status
  const notifyDataSync = useCallback(async (
    syncType: string,
    itemCount: number,
    success: boolean
  ) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    if (success) {
      const title = '🔄 Data synced';
      const body = `${itemCount} ${syncType} item${itemCount !== 1 ? 's' : ''} synchronized`;
      showToast('system', title, body);
      // Only send push for large syncs
      if (itemCount > 10) {
        await notifySystem(userId, title, body, {
          action: 'data_sync',
          syncType,
          itemCount,
        });
      }
    } else {
      const title = '⚠️ Sync failed';
      const body = `Failed to sync ${syncType} data`;
      showToast('system', title, body);
      await notifySystem(userId, title, body, {
        action: 'sync_failed',
        syncType,
      });
    }
  }, []);

  // Notify app update available
  const notifyUpdateAvailable = useCallback(async (version?: string) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const title = '🆕 Update available';
    const body = version 
      ? `Version ${version} is available. Refresh to update.` 
      : 'A new version is available. Refresh to update.';

    showToast('system', title, body);
    await notifySystem(userId, title, body, {
      action: 'update_available',
      version,
    });
  }, []);

  // Notify storage warning
  const notifyStorageWarning = useCallback(async (usedPercent: number) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const title = '💾 Storage warning';
    const body = `You've used ${usedPercent}% of your storage. Consider cleaning up old data.`;

    showToast('system', title, body);
    await notifySystem(userId, title, body, {
      action: 'storage_warning',
      usedPercent,
    });
  }, []);

  return {
    notifyJobStatus,
    notifySystemError,
    notifyConnectivityIssue,
    notifyDataSync,
    notifyUpdateAvailable,
    notifyStorageWarning,
  };
}

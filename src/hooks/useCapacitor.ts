/**
 * useCapacitor Hook
 * 
 * Initializes Capacitor plugins and provides app lifecycle management.
 * Should be used once at the app root level.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CapacitorPlatform } from '@/lib/capacitor';
import { initializeAppLifecycle, getAppInfo } from '@/lib/capacitor/app-lifecycle';
import { registerForPush, setupPushListeners, savePushToken } from '@/lib/capacitor/push-notifications';
import { CapacitorStorage, StorageKeys } from '@/lib/capacitor/storage';
import { useAuth } from '@/providers/AuthProvider';

interface AppInfo {
  name: string;
  id: string;
  build: string;
  version: string;
}

export function useCapacitor() {
  const navigate = useNavigate();
  const { isAuthenticated, userKey } = useAuth();
  const initializedRef = useRef(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    setIsNative(CapacitorPlatform.isNative());

    const initialize = async () => {
      if (!CapacitorPlatform.isNative()) return;

      console.log('[Capacitor] Initializing native app...');

      // Initialize app lifecycle handlers
      await initializeAppLifecycle({
        onDeepLink: (url) => {
          console.log('[Capacitor] Deep link:', url);
          // Parse URL and navigate
          try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;
            if (path) {
              navigate(path);
            }
          } catch (e) {
            console.error('[Capacitor] Invalid deep link URL:', e);
          }
        },
        onBackButton: () => {
          // Custom back button handling if needed
          // Return true to prevent default behavior
          return false;
        },
      });

      // Get app info
      const info = await getAppInfo();
      if (info) {
        setAppInfo(info);
        console.log('[Capacitor] App info:', info);
      }

      // Migrate any localStorage data to native storage
      await CapacitorStorage.migrateFromLocalStorage([
        StorageKeys.THEME,
        StorageKeys.VOICE_ENABLED,
        StorageKeys.ONBOARDING_COMPLETE,
      ]);
    };

    initialize();
  }, [navigate]);

  // Set up push notifications when authenticated
  useEffect(() => {
    if (!CapacitorPlatform.isNative() || !isAuthenticated || !userKey) return;

    const setupPush = async () => {
      console.log('[Capacitor] Setting up push notifications...');
      
      // Set up notification listeners
      const cleanup = setupPushListeners((notification, actionId) => {
        console.log('[Capacitor] Notification clicked:', notification, actionId);
        
        // Handle notification click - navigate based on data
        const data = notification.data as Record<string, unknown> | undefined;
        if (data?.url && typeof data.url === 'string') {
          navigate(data.url);
        }
      });

      // Register for push and save token
      const token = await registerForPush();
      if (token) {
        await savePushToken(token, userKey);
      }

      return cleanup;
    };

    let cleanupFn: (() => void) | undefined;
    setupPush().then((cleanup) => {
      cleanupFn = cleanup;
    });

    return () => {
      cleanupFn?.();
    };
  }, [isAuthenticated, userKey, navigate]);

  return {
    isNative,
    platform: CapacitorPlatform.getPlatform(),
    appInfo,
    isIOS: CapacitorPlatform.isIOS(),
    isAndroid: CapacitorPlatform.isAndroid(),
  };
}

export default useCapacitor;

/**
 * Capacitor Push Notifications
 * 
 * Provides unified push notification handling that uses:
 * - @capacitor/push-notifications on native (iOS/Android)
 * - Service Worker Push API on web
 * 
 * This ensures push notifications work correctly across all platforms.
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { CapacitorPlatform } from './index';
import { supabase } from '@/integrations/supabase/client';

export interface PushNotificationToken {
  value: string;
  platform: 'ios' | 'android' | 'web';
}

export interface NotificationClickHandler {
  (notification: PushNotificationSchema, actionId?: string): void;
}

let clickHandler: NotificationClickHandler | null = null;

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (CapacitorPlatform.isNative()) {
    return CapacitorPlatform.isPluginAvailable('PushNotifications');
  }
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<'granted' | 'denied'> {
  if (!isPushSupported()) return 'denied';

  if (CapacitorPlatform.isNative()) {
    const result = await PushNotifications.requestPermissions();
    return result.receive === 'granted' ? 'granted' : 'denied';
  } else {
    // Web notification permission
    const permission = await Notification.requestPermission();
    return permission === 'granted' ? 'granted' : 'denied';
  }
}

/**
 * Check current push notification permission status
 */
export async function checkPushPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isPushSupported()) return 'denied';

  if (CapacitorPlatform.isNative()) {
    const result = await PushNotifications.checkPermissions();
    if (result.receive === 'granted') return 'granted';
    if (result.receive === 'denied') return 'denied';
    return 'prompt';
  } else {
    const permission = Notification.permission;
    if (permission === 'granted') return 'granted';
    if (permission === 'denied') return 'denied';
    return 'prompt';
  }
}

/**
 * Register for push notifications and get token
 */
export async function registerForPush(): Promise<PushNotificationToken | null> {
  if (!isPushSupported()) return null;

  const permission = await requestPushPermission();
  if (permission !== 'granted') return null;

  if (CapacitorPlatform.isNative()) {
    return new Promise((resolve) => {
      // Set up token listener
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('[Push] Native token received:', token.value.substring(0, 20) + '...');
        resolve({
          value: token.value,
          platform: CapacitorPlatform.isIOS() ? 'ios' : 'android',
        });
      });

      // Handle registration errors
      PushNotifications.addListener('registrationError', (error: unknown) => {
        console.error('[Push] Registration error:', error);
        resolve(null);
      });

      // Request registration
      PushNotifications.register();
    });
  } else {
    // Web push - handled by existing web push system
    return null;
  }
}

/**
 * Set up push notification listeners
 */
export function setupPushListeners(onNotificationClick?: NotificationClickHandler): () => void {
  if (!CapacitorPlatform.isNative()) {
    // Web listeners are handled by service worker
    return () => {};
  }

  clickHandler = onNotificationClick || null;

  // Notification received while app is in foreground
  const foregroundListener = PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      console.log('[Push] Foreground notification:', notification);
      // Could show in-app notification here
    }
  );

  // Notification tapped by user
  const actionListener = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (event: ActionPerformed) => {
      console.log('[Push] Notification action:', event);
      if (clickHandler) {
        clickHandler(event.notification, event.actionId);
      }
    }
  );

  // Return cleanup function
  return () => {
    foregroundListener.then(l => l.remove());
    actionListener.then(l => l.remove());
  };
}

/**
 * Save push token to backend
 */
export async function savePushToken(token: PushNotificationToken, userKey: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        action: 'register-native',
        userKey,
        token: token.value,
        platform: token.platform,
        deviceInfo: {
          platform: token.platform,
          timestamp: new Date().toISOString(),
        },
      },
    });

    if (error) {
      console.error('[Push] Error saving token:', error);
      return false;
    }

    console.log('[Push] Token saved successfully');
    return true;
  } catch (err) {
    console.error('[Push] Error saving token:', err);
    return false;
  }
}

/**
 * Get delivered notifications (iOS only)
 */
export async function getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
  if (!CapacitorPlatform.isNative()) return [];
  
  const result = await PushNotifications.getDeliveredNotifications();
  return result.notifications;
}

/**
 * Remove all delivered notifications
 */
export async function removeAllDeliveredNotifications(): Promise<void> {
  if (!CapacitorPlatform.isNative()) return;
  
  await PushNotifications.removeAllDeliveredNotifications();
}

/**
 * Remove specific delivered notifications by ID
 */
export async function removeDeliveredNotifications(ids: string[]): Promise<void> {
  if (!CapacitorPlatform.isNative() || ids.length === 0) return;
  
  await PushNotifications.removeDeliveredNotifications({
    notifications: ids.map(id => ({ id, title: '', body: '', data: {} })),
  });
}

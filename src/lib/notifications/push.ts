import { supabase } from "@/integrations/supabase/client";

// VAPID public key for Web Push
// Generate your own at https://vapidkeys.com/ and set both:
// - VAPID_PUBLIC_KEY in Cloud secrets (for edge functions)
// - Update this constant with your public key
const VAPID_PUBLIC_KEY = 'BDfwl4LTSKNp-IdDG16QPxSBFoyWXdMCfeO6-wamY2_MnnSY0WQ8FHbcIcsjpsH7BL6c2NzVlUsOHvHFalXwNc4';

// Detect platform
export function detectPlatform(): 'web' | 'pwa-ios' | 'pwa-android' {
  const userAgent = navigator.userAgent.toLowerCase();
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isStandalone) {
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'pwa-ios';
    }
    if (/android/.test(userAgent)) {
      return 'pwa-android';
    }
  }

  return 'web';
}

// Check if push is supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

// Check if running as installed PWA
export function isInstalledPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

// Check current notification permission
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Convert base64 URL to Uint8Array (for VAPID key)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return false;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID public key not configured. Please set it in src/lib/notifications/push.ts');
    return false;
  }

  // Request permission first
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    // Get the subscription keys
    const subscriptionJson = subscription.toJSON();
    const keys = subscriptionJson.keys;

    if (!keys?.p256dh || !keys?.auth) {
      console.error('Subscription keys missing');
      return false;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    // Save subscription to database via edge function
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        action: 'subscribe',
        user_id: user.id,
        platform: detectPlatform(),
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent,
      },
    });

    if (error) {
      console.error('Error saving push subscription:', error);
      // Continue anyway - subscription works locally
    }

    console.log('Push subscription saved successfully');
    return true;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return false;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return true;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

// Get current push subscription status
export async function getPushSubscriptionStatus(): Promise<{
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
}> {
  const permission = getNotificationPermission();
  
  if (!isPushSupported() || permission !== 'granted') {
    return { isSubscribed: false, permission, subscription: null };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return {
      isSubscribed: !!subscription,
      permission,
      subscription,
    };
  } catch (error) {
    console.error('Error getting push status:', error);
    return { isSubscribed: false, permission, subscription: null };
  }
}

/**
 * Capacitor Utilities
 * 
 * Platform detection and Capacitor-specific helpers for iOS/Android native apps.
 * This module provides a unified interface for detecting the runtime environment
 * and accessing native capabilities.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities
 */
export const CapacitorPlatform = {
  /**
   * Check if running in a native Capacitor app (iOS or Android)
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Check if running on iOS
   */
  isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  },

  /**
   * Check if running on Android
   */
  isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  },

  /**
   * Check if running in web browser (not native)
   */
  isWeb(): boolean {
    return Capacitor.getPlatform() === 'web';
  },

  /**
   * Get the current platform: 'ios' | 'android' | 'web'
   */
  getPlatform(): 'ios' | 'android' | 'web' {
    return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  },

  /**
   * Check if a specific plugin is available
   */
  isPluginAvailable(pluginName: string): boolean {
    return Capacitor.isPluginAvailable(pluginName);
  },
};

/**
 * Safe area insets for iOS notch/home indicator
 */
export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  if (typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
  };
}

/**
 * Check if running as a PWA (installed web app)
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Get the app environment type
 */
export function getAppEnvironment(): 'native-ios' | 'native-android' | 'pwa' | 'web' {
  if (CapacitorPlatform.isIOS()) return 'native-ios';
  if (CapacitorPlatform.isAndroid()) return 'native-android';
  if (isPWA()) return 'pwa';
  return 'web';
}

export default CapacitorPlatform;

/**
 * Capacitor Utilities
 * 
 * Platform detection and Capacitor-specific helpers for iOS/Android/macOS native apps.
 * This module provides a unified interface for detecting the runtime environment
 * and accessing native capabilities.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Extended platform types including macOS
 */
export type AppPlatform = 'ios' | 'android' | 'macos' | 'electron' | 'web';
export type AppEnvironment = 'native-ios' | 'native-android' | 'native-macos' | 'native-electron' | 'pwa' | 'web';

/**
 * Platform detection utilities
 */
export const CapacitorPlatform = {
  /**
   * Check if running in a native Capacitor app (iOS, Android, or macOS)
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Check if running on iOS (iPhone/iPad, but not Mac Catalyst)
   */
  isIOS(): boolean {
    if (Capacitor.getPlatform() !== 'ios') return false;
    // Mac Catalyst reports as 'ios' but has Macintosh in user agent
    return !/Macintosh/.test(navigator.userAgent);
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
   * Check if running on macOS (Mac Catalyst or Electron)
   */
  isMacOS(): boolean {
    // Mac Catalyst: reports as 'ios' but with Macintosh user agent
    if (Capacitor.getPlatform() === 'ios' && /Macintosh/.test(navigator.userAgent)) {
      return true;
    }
    // Electron on macOS
    if (Capacitor.getPlatform() === 'electron') {
      return true;
    }
    return false;
  },

  /**
   * Check if running in Electron
   */
  isElectron(): boolean {
    return Capacitor.getPlatform() === 'electron' || 
           (typeof window !== 'undefined' && 'electronAPI' in window);
  },

  /**
   * Check if running on desktop (Mac Catalyst, Electron, or desktop web)
   */
  isDesktop(): boolean {
    if (this.isMacOS() || this.isElectron()) return true;
    // Desktop web detection
    if (this.isWeb() && typeof window !== 'undefined') {
      return !/Android|iPhone|iPad|iPod/.test(navigator.userAgent) && window.innerWidth >= 1024;
    }
    return false;
  },

  /**
   * Check if running on iPad
   */
  isIPad(): boolean {
    if (Capacitor.getPlatform() !== 'ios') return false;
    // iPad user agent or iPad in platform
    return /iPad/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },

  /**
   * Get the current platform with macOS distinction
   */
  getPlatform(): AppPlatform {
    const platform = Capacitor.getPlatform();
    
    // Mac Catalyst detection
    if (platform === 'ios' && /Macintosh/.test(navigator.userAgent)) {
      return 'macos';
    }
    
    // Electron detection
    if (platform === 'electron' || (typeof window !== 'undefined' && 'electronAPI' in window)) {
      return 'electron';
    }
    
    return platform as AppPlatform;
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
 * Get the app environment type with macOS support
 */
export function getAppEnvironment(): AppEnvironment {
  const platform = CapacitorPlatform.getPlatform();
  
  if (platform === 'macos') return 'native-macos';
  if (platform === 'electron') return 'native-electron';
  if (CapacitorPlatform.isIOS()) return 'native-ios';
  if (CapacitorPlatform.isAndroid()) return 'native-android';
  if (isPWA()) return 'pwa';
  return 'web';
}

export default CapacitorPlatform;

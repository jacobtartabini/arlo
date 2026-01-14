/**
 * Electron-specific utilities for macOS desktop app
 * 
 * Provides native desktop integrations when running in Electron.
 * Falls back gracefully to web APIs when not available.
 */

import { CapacitorPlatform } from './index';

interface ElectronAPI {
  showNotification?: (title: string, body: string) => void;
  setBadgeCount?: (count: number) => void;
  setTrayTitle?: (title: string) => void;
  showTrayBalloon?: (title: string, content: string) => void;
  platform?: string;
  isMac?: boolean;
}

/**
 * Get the Electron API exposed via preload script
 */
function getElectronAPI(): ElectronAPI | null {
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return (window as { electronAPI?: ElectronAPI }).electronAPI || null;
  }
  return null;
}

export const ElectronUtils = {
  /**
   * Check if running in Electron
   */
  isElectron(): boolean {
    return CapacitorPlatform.isElectron();
  },

  /**
   * Check if running on macOS (via Electron)
   */
  isMac(): boolean {
    const api = getElectronAPI();
    return api?.isMac ?? false;
  },

  /**
   * Show native macOS notification
   */
  async showNotification(title: string, body: string): Promise<void> {
    const api = getElectronAPI();
    
    if (api?.showNotification) {
      api.showNotification(title, body);
      return;
    }

    // Fallback to web Notification API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      }
    }
  },

  /**
   * Set app badge count (macOS dock badge)
   */
  async setBadgeCount(count: number): Promise<void> {
    const api = getElectronAPI();
    
    if (api?.setBadgeCount) {
      api.setBadgeCount(count);
      return;
    }

    // Fallback to navigator.setAppBadge if available (PWA)
    if ('setAppBadge' in navigator) {
      try {
        if (count > 0) {
          await (navigator as { setAppBadge: (count: number) => Promise<void> }).setAppBadge(count);
        } else {
          await (navigator as { clearAppBadge: () => Promise<void> }).clearAppBadge();
        }
      } catch (e) {
        console.warn('[ElectronUtils] Failed to set badge:', e);
      }
    }
  },

  /**
   * Clear app badge
   */
  async clearBadge(): Promise<void> {
    return this.setBadgeCount(0);
  },

  /**
   * Set tray icon title (macOS menu bar)
   */
  setTrayTitle(title: string): void {
    const api = getElectronAPI();
    if (api?.setTrayTitle) {
      api.setTrayTitle(title);
    }
  },

  /**
   * Show tray balloon notification
   */
  showTrayBalloon(title: string, content: string): void {
    const api = getElectronAPI();
    if (api?.showTrayBalloon) {
      api.showTrayBalloon(title, content);
    }
  },
};

export default ElectronUtils;

/**
 * Capacitor Storage Utilities
 * 
 * Provides a unified storage interface that uses:
 * - @capacitor/preferences on native (iOS/Android)
 * - localStorage on web
 * 
 * This ensures auth tokens and user preferences persist correctly
 * across app restarts on native platforms.
 */

import { Preferences } from '@capacitor/preferences';
import { CapacitorPlatform } from './index';

/**
 * Storage interface for cross-platform data persistence
 */
export const CapacitorStorage = {
  /**
   * Set a value in storage
   */
  async set(key: string, value: string): Promise<void> {
    if (CapacitorPlatform.isNative()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  /**
   * Get a value from storage
   */
  async get(key: string): Promise<string | null> {
    if (CapacitorPlatform.isNative()) {
      const { value } = await Preferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  },

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    if (CapacitorPlatform.isNative()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  /**
   * Clear all stored values
   */
  async clear(): Promise<void> {
    if (CapacitorPlatform.isNative()) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  },

  /**
   * Get all keys in storage
   */
  async keys(): Promise<string[]> {
    if (CapacitorPlatform.isNative()) {
      const { keys } = await Preferences.keys();
      return keys;
    } else {
      return Object.keys(localStorage);
    }
  },

  /**
   * Migrate data from localStorage to Capacitor Preferences
   * Call this once when the app starts on native to migrate existing data
   */
  async migrateFromLocalStorage(keysToMigrate: string[]): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;

    for (const key of keysToMigrate) {
      const webValue = localStorage.getItem(key);
      if (webValue !== null) {
        const { value: nativeValue } = await Preferences.get({ key });
        // Only migrate if not already in native storage
        if (nativeValue === null) {
          await Preferences.set({ key, value: webValue });
          console.log(`[CapacitorStorage] Migrated ${key} to native storage`);
        }
      }
    }
  },
};

// Storage keys used by the app
export const StorageKeys = {
  // Auth
  AUTH_TOKEN: 'arlo_auth_token',
  AUTH_EXPIRY: 'arlo_auth_expiry',
  
  // User preferences
  THEME: 'arlo_theme',
  VOICE_ENABLED: 'arlo_voice_enabled',
  
  // App state
  LAST_ROUTE: 'arlo_last_route',
  ONBOARDING_COMPLETE: 'arlo_onboarding_complete',
} as const;

export default CapacitorStorage;

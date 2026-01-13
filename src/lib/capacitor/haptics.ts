/**
 * Capacitor Haptics Utilities
 * 
 * Provides haptic feedback for native iOS/Android apps.
 * Falls back to no-op on web.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { CapacitorPlatform } from './index';

/**
 * Haptic feedback utilities
 */
export const HapticFeedback = {
  /**
   * Light impact feedback (e.g., button tap)
   */
  async light(): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.warn('[Haptics] Light impact failed:', e);
    }
  },

  /**
   * Medium impact feedback (e.g., toggle switch)
   */
  async medium(): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.warn('[Haptics] Medium impact failed:', e);
    }
  },

  /**
   * Heavy impact feedback (e.g., significant action)
   */
  async heavy(): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.warn('[Haptics] Heavy impact failed:', e);
    }
  },

  /**
   * Success notification feedback
   */
  async success(): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      console.warn('[Haptics] Success notification failed:', e);
    }
  },

  /**
   * Warning notification feedback
   */
  async warning(): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (e) {
      console.warn('[Haptics] Warning notification failed:', e);
    }
  },

  /**
   * Error notification feedback
   */
  async error(): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      console.warn('[Haptics] Error notification failed:', e);
    }
  },

  /**
   * Selection change feedback (e.g., picker scroll)
   */
  async selection(): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.selectionChanged();
    } catch (e) {
      console.warn('[Haptics] Selection changed failed:', e);
    }
  },

  /**
   * Start a selection feedback session
   */
  async selectionStart(): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.selectionStart();
    } catch (e) {
      console.warn('[Haptics] Selection start failed:', e);
    }
  },

  /**
   * End a selection feedback session
   */
  async selectionEnd(): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.selectionEnd();
    } catch (e) {
      console.warn('[Haptics] Selection end failed:', e);
    }
  },

  /**
   * Custom vibration pattern (Android only)
   * Duration in milliseconds
   */
  async vibrate(duration: number = 300): Promise<void> {
    if (!CapacitorPlatform.isNative()) return;
    
    try {
      await Haptics.vibrate({ duration });
    } catch (e) {
      console.warn('[Haptics] Vibrate failed:', e);
    }
  },
};

export default HapticFeedback;

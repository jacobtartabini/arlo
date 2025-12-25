import { useEffect, useRef, useCallback } from 'react';
import { notifySecurity, showToast, getCurrentUserId } from '@/lib/notifications/notify';

interface LoginAttempt {
  timestamp: Date;
  success: boolean;
  userAgent: string;
  ip?: string;
}

// Store for tracking login attempts (would typically be in a database)
const loginAttemptsStore: LoginAttempt[] = [];
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Hook to monitor security events and send notifications for:
 * - New login detected
 * - New/changed device
 * - Suspicious or repeated failed access attempts
 */
export function useSecurityNotifications() {
  const knownDevicesRef = useRef<Set<string>>(new Set());
  const lastKnownIPRef = useRef<string | null>(null);

  // Initialize known devices from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('arlo_known_devices');
    if (stored) {
      try {
        const devices = JSON.parse(stored);
        devices.forEach((d: string) => knownDevicesRef.current.add(d));
      } catch (e) {
        console.error('Failed to parse known devices:', e);
      }
    }
  }, []);

  // Get device fingerprint
  const getDeviceFingerprint = useCallback((): string => {
    const ua = navigator.userAgent;
    const screenRes = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    // Create a simple hash
    const fingerprint = `${ua}-${screenRes}-${timezone}-${language}`;
    return btoa(fingerprint).slice(0, 32);
  }, []);

  // Save device as known
  const saveKnownDevice = useCallback((fingerprint: string) => {
    knownDevicesRef.current.add(fingerprint);
    const devices = Array.from(knownDevicesRef.current);
    localStorage.setItem('arlo_known_devices', JSON.stringify(devices));
  }, []);

  // Notify on new login
  const notifyNewLogin = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const deviceFingerprint = getDeviceFingerprint();
    const isNewDevice = !knownDevicesRef.current.has(deviceFingerprint);

    // Format device info
    const ua = navigator.userAgent;
    let deviceName = 'Unknown device';
    if (ua.includes('iPhone')) deviceName = 'iPhone';
    else if (ua.includes('iPad')) deviceName = 'iPad';
    else if (ua.includes('Android')) deviceName = 'Android device';
    else if (ua.includes('Mac')) deviceName = 'Mac';
    else if (ua.includes('Windows')) deviceName = 'Windows PC';
    else if (ua.includes('Linux')) deviceName = 'Linux device';

    const browserName = ua.includes('Chrome') ? 'Chrome' : 
                        ua.includes('Safari') ? 'Safari' : 
                        ua.includes('Firefox') ? 'Firefox' : 
                        ua.includes('Edge') ? 'Edge' : 'browser';

    if (isNewDevice) {
      const title = '🔐 New device login';
      const body = `Signed in from a new ${deviceName} using ${browserName}`;

      showToast('security', title, body);
      await notifySecurity(userId, title, body, {
        action: 'new_device',
        deviceFingerprint,
        deviceName,
        browser: browserName,
        timestamp: new Date().toISOString(),
      });

      // Save as known device
      saveKnownDevice(deviceFingerprint);
    } else {
      // Regular login notification
      const title = '✓ Login successful';
      const body = `Signed in on ${deviceName}`;
      
      showToast('security', title, body);
      await notifySecurity(userId, title, body, {
        action: 'login',
        deviceName,
        timestamp: new Date().toISOString(),
      });
    }

    // Record successful login
    loginAttemptsStore.push({
      timestamp: new Date(),
      success: true,
      userAgent: navigator.userAgent,
    });
  }, [getDeviceFingerprint, saveKnownDevice]);

  // Notify on failed login attempt
  const notifyFailedLogin = useCallback(async (reason?: string) => {
    const userId = await getCurrentUserId();
    
    // Record failed attempt
    loginAttemptsStore.push({
      timestamp: new Date(),
      success: false,
      userAgent: navigator.userAgent,
    });

    // Check for suspicious activity (multiple failed attempts)
    const recentAttempts = loginAttemptsStore.filter(
      a => !a.success && 
      Date.now() - a.timestamp.getTime() < LOCKOUT_WINDOW_MS
    );

    if (recentAttempts.length >= MAX_FAILED_ATTEMPTS) {
      const title = '🚨 Suspicious login activity';
      const body = `${recentAttempts.length} failed login attempts detected in the last 15 minutes`;

      showToast('security', title, body);
      
      if (userId) {
        await notifySecurity(userId, title, body, {
          action: 'suspicious_activity',
          failedAttempts: recentAttempts.length,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      const title = '⚠️ Login failed';
      const body = reason || 'Please check your credentials and try again';
      showToast('security', title, body);
    }
  }, []);

  // Notify on device change (different from known devices mid-session)
  const notifyDeviceChange = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const currentFingerprint = getDeviceFingerprint();
    
    const title = '🔄 Device change detected';
    const body = 'Your session has been accessed from a different device';

    showToast('security', title, body);
    await notifySecurity(userId, title, body, {
      action: 'device_change',
      newFingerprint: currentFingerprint,
      timestamp: new Date().toISOString(),
    });
  }, [getDeviceFingerprint]);

  // Notify on session expiry
  const notifySessionExpiry = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const title = '🔒 Session expired';
    const body = 'Your session has expired for security. Please log in again.';

    showToast('security', title, body);
    await notifySecurity(userId, title, body, {
      action: 'session_expired',
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Check for any security-relevant changes periodically
  const runSecurityCheck = useCallback(async () => {
    const currentFingerprint = getDeviceFingerprint();
    
    // Check if device has changed mid-session
    const sessionDevice = sessionStorage.getItem('arlo_session_device');
    if (sessionDevice && sessionDevice !== currentFingerprint) {
      await notifyDeviceChange();
      sessionStorage.setItem('arlo_session_device', currentFingerprint);
    } else if (!sessionDevice) {
      sessionStorage.setItem('arlo_session_device', currentFingerprint);
    }
  }, [getDeviceFingerprint, notifyDeviceChange]);

  // Set up periodic security check
  useEffect(() => {
    const interval = setInterval(runSecurityCheck, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [runSecurityCheck]);

  return {
    notifyNewLogin,
    notifyFailedLogin,
    notifyDeviceChange,
    notifySessionExpiry,
    runSecurityCheck,
  };
}

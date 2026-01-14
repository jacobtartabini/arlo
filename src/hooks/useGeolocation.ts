/**
 * useGeolocation Hook
 * 
 * Cross-platform geolocation hook that uses native Capacitor plugin on iOS/Android
 * and falls back to browser geolocation API on web.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LatLng } from '@/types/maps';
import { CapacitorPlatform } from '@/lib/capacitor';
import { 
  getCurrentPosition as getNativePosition,
  watchPosition as watchNativePosition,
  checkGeolocationPermission,
  requestGeolocationPermission,
  GeoPosition 
} from '@/lib/capacitor/geolocation';

interface GeolocationState {
  position: LatLng | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  isWatching: boolean;
  permissionStatus: PermissionState | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cleanupRef = useRef<(() => void) | number | null>(null);
  const isNative = CapacitorPlatform.isNative();
  
  const [state, setState] = useState<GeolocationState>({
    position: null,
    heading: null,
    speed: null,
    accuracy: null,
    error: null,
    isLoading: false,
    isWatching: false,
    permissionStatus: null,
  });

  // Check permission status
  useEffect(() => {
    const checkPerms = async () => {
      try {
        const status = await checkGeolocationPermission();
        setState(prev => ({ ...prev, permissionStatus: status as PermissionState }));
      } catch {
        // Permissions API not fully supported
      }
    };

    checkPerms();
  }, []);

  // Handle position update from GeoPosition
  const handlePositionUpdate = useCallback((pos: GeoPosition) => {
    setState(prev => ({
      ...prev,
      position: { lat: pos.lat, lng: pos.lng },
      heading: pos.heading,
      speed: pos.speed,
      accuracy: pos.accuracy,
      isLoading: false,
      error: null,
    }));
  }, []);

  // Get current position once
  const getCurrentPosition = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission if needed on native
      if (isNative) {
        const permStatus = await checkGeolocationPermission();
        if (permStatus !== 'granted') {
          const requested = await requestGeolocationPermission();
          if (requested !== 'granted') {
            throw new Error('Location permission denied');
          }
        }
      }

      const position = await getNativePosition({
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      });

      handlePositionUpdate(position);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown location error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [isNative, opts.enableHighAccuracy, opts.timeout, opts.maximumAge, handlePositionUpdate]);

  // Start watching position
  const startWatching = useCallback(async () => {
    if (cleanupRef.current !== null) return; // Already watching

    setState(prev => ({ ...prev, isWatching: true, error: null }));

    try {
      // Request permission if needed on native
      if (isNative) {
        const permStatus = await checkGeolocationPermission();
        if (permStatus !== 'granted') {
          const requested = await requestGeolocationPermission();
          if (requested !== 'granted') {
            throw new Error('Location permission denied');
          }
        }
      }

      const cleanup = await watchNativePosition(
        (position) => handlePositionUpdate(position),
        (error) => setState(prev => ({ ...prev, error: error.message })),
        {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge,
        }
      );
      
      cleanupRef.current = cleanup;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown location error';
      setState(prev => ({ ...prev, isWatching: false, error: message }));
    }
  }, [isNative, opts.enableHighAccuracy, opts.timeout, opts.maximumAge, handlePositionUpdate]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (cleanupRef.current !== null) {
      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current();
      } else if (typeof cleanupRef.current === 'number') {
        navigator.geolocation.clearWatch(cleanupRef.current);
      }
      cleanupRef.current = null;
      setState(prev => ({ ...prev, isWatching: false }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current !== null) {
        if (typeof cleanupRef.current === 'function') {
          cleanupRef.current();
        } else if (typeof cleanupRef.current === 'number') {
          navigator.geolocation.clearWatch(cleanupRef.current);
        }
      }
    };
  }, []);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    isSupported: isNative || 'geolocation' in navigator,
    isNative,
  };
}

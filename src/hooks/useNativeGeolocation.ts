/**
 * useNativeGeolocation Hook
 * 
 * Provides a unified geolocation interface that automatically uses:
 * - @capacitor/geolocation on native (iOS/Android)  
 * - navigator.geolocation on web
 * 
 * This is a drop-in replacement for the existing useGeolocation hook
 * that adds native Capacitor support.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CapacitorPlatform } from '@/lib/capacitor';
import {
  getCurrentPosition,
  watchPosition,
  checkGeolocationPermission,
  isGeolocationAvailable,
  type GeoPosition,
  type GeoOptions,
} from '@/lib/capacitor/geolocation';
import type { LatLng } from '@/types/maps';

interface GeolocationState {
  position: LatLng | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  isWatching: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt' | null;
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

export function useNativeGeolocation(options: UseGeolocationOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cleanupRef = useRef<(() => void) | null>(null);
  
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

  // Check permission status on mount
  useEffect(() => {
    checkGeolocationPermission().then(status => {
      setState(prev => ({ ...prev, permissionStatus: status }));
    });
  }, []);

  // Convert GeoPosition to our state format
  const updateFromPosition = useCallback((position: GeoPosition) => {
    setState(prev => ({
      ...prev,
      position: { lat: position.lat, lng: position.lng },
      heading: position.heading,
      speed: position.speed,
      accuracy: position.accuracy,
      isLoading: false,
      error: null,
    }));
  }, []);

  // Get current position once
  const getPosition = useCallback(async () => {
    if (!isGeolocationAvailable()) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const position = await getCurrentPosition(opts as GeoOptions);
      updateFromPosition(position);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [opts, updateFromPosition]);

  // Start watching position
  const startWatching = useCallback(async () => {
    if (!isGeolocationAvailable()) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    if (cleanupRef.current) return; // Already watching

    setState(prev => ({ ...prev, isWatching: true, error: null }));

    try {
      const cleanup = await watchPosition(
        (position) => {
          updateFromPosition(position);
        },
        (error) => {
          setState(prev => ({ ...prev, error: error.message }));
        },
        opts as GeoOptions
      );

      cleanupRef.current = cleanup;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isWatching: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [opts, updateFromPosition]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
      setState(prev => ({ ...prev, isWatching: false }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    ...state,
    getCurrentPosition: getPosition,
    startWatching,
    stopWatching,
    isSupported: isGeolocationAvailable(),
    isNative: CapacitorPlatform.isNative(),
  };
}

export default useNativeGeolocation;

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LatLng } from '@/types/maps';

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
  const watchIdRef = useRef<number | null>(null);
  
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
    if (!navigator.permissions) return;

    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      setState(prev => ({ ...prev, permissionStatus: result.state }));
      
      result.addEventListener('change', () => {
        setState(prev => ({ ...prev, permissionStatus: result.state }));
      });
    });
  }, []);

  // Get current position once
  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          position: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
          isLoading: false,
          error: null,
        }));
      },
      (error) => {
        let errorMessage: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown location error';
        }
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      }
    );
  }, [opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    if (watchIdRef.current !== null) return; // Already watching

    setState(prev => ({ ...prev, isWatching: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          position: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
          error: null,
        }));
      },
      (error) => {
        let errorMessage: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown location error';
        }
        setState(prev => ({ ...prev, error: errorMessage }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      }
    );
  }, [opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setState(prev => ({ ...prev, isWatching: false }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    isSupported: 'geolocation' in navigator,
  };
}

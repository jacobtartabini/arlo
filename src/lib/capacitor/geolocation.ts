/**
 * Capacitor Geolocation Utilities
 * 
 * Provides a unified geolocation interface that uses:
 * - @capacitor/geolocation on native (iOS/Android)
 * - navigator.geolocation on web
 * 
 * Native plugins provide better accuracy, background location,
 * and proper permission handling on iOS/Android.
 */

import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';
import { CapacitorPlatform } from './index';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GeoOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const DEFAULT_OPTIONS: GeoOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

/**
 * Convert Capacitor Position to our GeoPosition format
 */
function toGeoPosition(position: Position): GeoPosition {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    heading: position.coords.heading ?? null,
    speed: position.coords.speed ?? null,
    timestamp: position.timestamp,
  };
}

/**
 * Check if geolocation is available
 */
export function isGeolocationAvailable(): boolean {
  if (CapacitorPlatform.isNative()) {
    return CapacitorPlatform.isPluginAvailable('Geolocation');
  }
  return 'geolocation' in navigator;
}

/**
 * Check geolocation permission status
 */
export async function checkGeolocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (CapacitorPlatform.isNative()) {
    const status: PermissionStatus = await Geolocation.checkPermissions();
    
    // Capacitor returns 'location' permission
    const locationStatus = status.location;
    if (locationStatus === 'granted') return 'granted';
    if (locationStatus === 'denied') return 'denied';
    return 'prompt';
  } else {
    // Web permissions API
    if (!navigator.permissions) return 'prompt';
    
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch {
      return 'prompt';
    }
  }
}

/**
 * Request geolocation permission
 */
export async function requestGeolocationPermission(): Promise<'granted' | 'denied'> {
  if (CapacitorPlatform.isNative()) {
    const status = await Geolocation.requestPermissions();
    return status.location === 'granted' ? 'granted' : 'denied';
  } else {
    // On web, we need to actually try to get position to trigger permission
    try {
      await getCurrentPosition();
      return 'granted';
    } catch {
      return 'denied';
    }
  }
}

/**
 * Get current position (one-time)
 */
export async function getCurrentPosition(options: GeoOptions = {}): Promise<GeoPosition> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (CapacitorPlatform.isNative()) {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: opts.enableHighAccuracy,
      timeout: opts.timeout,
      maximumAge: opts.maximumAge,
    });
    return toGeoPosition(position);
  } else {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          reject(new Error(getGeoErrorMessage(error.code)));
        },
        opts
      );
    });
  }
}

/**
 * Watch position (continuous updates)
 * Returns a cleanup function to stop watching
 */
export async function watchPosition(
  callback: (position: GeoPosition) => void,
  errorCallback: (error: Error) => void,
  options: GeoOptions = {}
): Promise<() => void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (CapacitorPlatform.isNative()) {
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      },
      (position, err) => {
        if (err) {
          errorCallback(new Error(err.message));
        } else if (position) {
          callback(toGeoPosition(position));
        }
      }
    );

    return () => {
      Geolocation.clearWatch({ id: watchId });
    };
  } else {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        errorCallback(new Error(getGeoErrorMessage(error.code)));
      },
      opts
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }
}

/**
 * Get human-readable error message for geolocation errors
 */
function getGeoErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location permission denied';
    case 2:
      return 'Location unavailable';
    case 3:
      return 'Location request timed out';
    default:
      return 'Unknown location error';
  }
}

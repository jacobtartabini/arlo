/**
 * Desktop Detection Hook
 * 
 * Detects if the app is running on a desktop environment
 * (Mac Catalyst, Electron, or desktop web browser).
 */

import { useState, useEffect } from 'react';
import { CapacitorPlatform } from '@/lib/capacitor';

/**
 * Hook to detect if running on a desktop platform
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    // Initial check
    return CapacitorPlatform.isDesktop();
  });

  useEffect(() => {
    const checkDesktop = () => {
      // Desktop if: Electron, Mac Catalyst, or wide screen web
      const isNativeDesktop = CapacitorPlatform.isMacOS() || CapacitorPlatform.isElectron();
      const isWideScreenWeb = !CapacitorPlatform.isNative() && window.innerWidth >= 1024;
      const hasPointer = window.matchMedia('(pointer: fine)').matches;
      
      // Consider desktop if native desktop OR (wide screen web with mouse pointer)
      setIsDesktop(isNativeDesktop || (isWideScreenWeb && hasPointer));
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return isDesktop;
}

/**
 * Hook to get the current platform type for UI decisions
 */
export function usePlatformType(): 'mobile' | 'tablet' | 'desktop' {
  const [platformType, setPlatformType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const detectPlatform = () => {
      // Native desktop (Mac Catalyst or Electron)
      if (CapacitorPlatform.isMacOS() || CapacitorPlatform.isElectron()) {
        setPlatformType('desktop');
        return;
      }

      // iPad
      if (CapacitorPlatform.isIPad()) {
        setPlatformType('tablet');
        return;
      }

      // iOS/Android native
      if (CapacitorPlatform.isIOS() || CapacitorPlatform.isAndroid()) {
        setPlatformType('mobile');
        return;
      }

      // Web: use screen size
      const width = window.innerWidth;
      if (width >= 1024) {
        setPlatformType('desktop');
      } else if (width >= 768) {
        setPlatformType('tablet');
      } else {
        setPlatformType('mobile');
      }
    };

    detectPlatform();
    window.addEventListener('resize', detectPlatform);
    
    return () => window.removeEventListener('resize', detectPlatform);
  }, []);

  return platformType;
}

export default useIsDesktop;

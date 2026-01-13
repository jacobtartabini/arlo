/**
 * CapacitorInitializer Component
 * 
 * Initializes Capacitor plugins at app startup.
 * Place this component inside your providers but outside routes.
 */

import { useEffect } from 'react';
import { useCapacitor } from '@/hooks/useCapacitor';

export function CapacitorInitializer() {
  const { isNative, platform } = useCapacitor();

  useEffect(() => {
    if (isNative) {
      console.log(`[CapacitorInitializer] Running on ${platform}`);
    }
  }, [isNative, platform]);

  // This component doesn't render anything
  return null;
}

export default CapacitorInitializer;

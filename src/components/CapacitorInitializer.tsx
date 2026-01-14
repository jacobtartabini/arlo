/**
 * CapacitorInitializer Component
 * 
 * Initializes Capacitor plugins at app startup.
 * Must be placed inside BrowserRouter (needs useNavigate).
 */

import { useEffect } from 'react';
import { useCapacitor } from '@/hooks/useCapacitor';
import { CapacitorPlatform } from '@/lib/capacitor';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';

export function CapacitorInitializer() {
  const { isNative, platform, isIOS, isAndroid } = useCapacitor();

  useEffect(() => {
    if (!isNative) return;

    const initializeNativeUI = async () => {
      console.log(`[CapacitorInitializer] Running on ${platform}`);

      try {
        // Configure status bar
        if (CapacitorPlatform.isPluginAvailable('StatusBar')) {
          await StatusBar.setStyle({ style: Style.Dark });
          if (isAndroid) {
            await StatusBar.setBackgroundColor({ color: '#000000' });
          }
        }

        // Configure keyboard behavior
        if (CapacitorPlatform.isPluginAvailable('Keyboard')) {
          if (isIOS) {
            await Keyboard.setAccessoryBarVisible({ isVisible: true });
            await Keyboard.setScroll({ isDisabled: false });
          }
        }

        // Hide splash screen after initialization
        if (CapacitorPlatform.isPluginAvailable('SplashScreen')) {
          await SplashScreen.hide({ fadeOutDuration: 300 });
        }
      } catch (error) {
        console.error('[CapacitorInitializer] Error:', error);
      }
    };

    initializeNativeUI();
  }, [isNative, platform, isIOS, isAndroid]);

  // This component doesn't render anything
  return null;
}

export default CapacitorInitializer;

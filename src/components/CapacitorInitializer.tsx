/**
 * CapacitorInitializer Component
 * 
 * Initializes Capacitor plugins at app startup.
 * Handles iOS, Android, and macOS (Mac Catalyst) platforms.
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
  const isMacOS = CapacitorPlatform.isMacOS();

  useEffect(() => {
    if (!isNative) return;

    const initializeNativeUI = async () => {
      console.log(`[CapacitorInitializer] Running on ${platform}${isMacOS ? ' (Mac Catalyst)' : ''}`);

      try {
        // Configure status bar (skip on Mac Catalyst - no mobile status bar)
        if (!isMacOS && CapacitorPlatform.isPluginAvailable('StatusBar')) {
          await StatusBar.setStyle({ style: Style.Dark });
          if (isAndroid) {
            await StatusBar.setBackgroundColor({ color: '#000000' });
          }
        }

        // Configure keyboard behavior (skip on Mac - has hardware keyboard)
        if (!isMacOS && CapacitorPlatform.isPluginAvailable('Keyboard')) {
          if (isIOS) {
            await Keyboard.setAccessoryBarVisible({ isVisible: true });
            await Keyboard.setScroll({ isDisabled: false });
          }
        }

        // Hide splash screen after initialization
        if (CapacitorPlatform.isPluginAvailable('SplashScreen')) {
          await SplashScreen.hide({ fadeOutDuration: 300 });
        }

        // Log environment info for debugging
        console.log('[CapacitorInitializer] Environment:', {
          platform: CapacitorPlatform.getPlatform(),
          isDesktop: CapacitorPlatform.isDesktop(),
          isIPad: CapacitorPlatform.isIPad(),
        });
      } catch (error) {
        console.error('[CapacitorInitializer] Error:', error);
      }
    };

    initializeNativeUI();
  }, [isNative, platform, isIOS, isAndroid, isMacOS]);

  // This component doesn't render anything
  return null;
}

export default CapacitorInitializer;

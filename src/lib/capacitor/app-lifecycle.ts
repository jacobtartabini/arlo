/**
 * Capacitor App Lifecycle Management
 * 
 * Handles app state changes, deep links, and back button behavior
 * for native iOS/Android apps.
 */

import { App, URLOpenListenerEvent } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { CapacitorPlatform } from './index';

export interface DeepLinkHandler {
  (url: string): void;
}

export interface BackButtonHandler {
  (): boolean; // Return true to prevent default behavior
}

let deepLinkHandler: DeepLinkHandler | null = null;
let backButtonHandler: BackButtonHandler | null = null;

/**
 * Initialize Capacitor app lifecycle handlers
 * Call this once at app startup
 */
export async function initializeAppLifecycle(options?: {
  onDeepLink?: DeepLinkHandler;
  onBackButton?: BackButtonHandler;
}): Promise<void> {
  if (!CapacitorPlatform.isNative()) return;

  deepLinkHandler = options?.onDeepLink || null;
  backButtonHandler = options?.onBackButton || null;

  // Configure status bar
  await configureStatusBar();

  // Set up deep link handling
  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    console.log('[App] Deep link opened:', event.url);
    if (deepLinkHandler) {
      deepLinkHandler(event.url);
    }
  });

  // Set up back button handling (Android)
  App.addListener('backButton', ({ canGoBack }) => {
    if (backButtonHandler && backButtonHandler()) {
      // Handler prevented default behavior
      return;
    }
    
    if (canGoBack) {
      window.history.back();
    } else {
      // At root, minimize app instead of exit
      App.minimizeApp();
    }
  });

  // App state change listeners
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('[App] State changed, isActive:', isActive);
    if (isActive) {
      // App came to foreground - could refresh data here
    }
  });

  // Keyboard listeners for iOS
  if (CapacitorPlatform.isIOS()) {
    setupKeyboardListeners();
  }

  // Hide splash screen after initialization
  await hideSplashScreen();
}

/**
 * Configure the status bar appearance
 */
async function configureStatusBar(): Promise<void> {
  if (!CapacitorPlatform.isNative()) return;

  try {
    // Check current theme and set appropriate status bar style
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    await StatusBar.setStyle({
      style: isDarkMode ? Style.Dark : Style.Light,
    });

    if (CapacitorPlatform.isAndroid()) {
      await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
    }

    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
      await StatusBar.setStyle({
        style: e.matches ? Style.Dark : Style.Light,
      });
    });
  } catch (e) {
    console.warn('[StatusBar] Configuration error:', e);
  }
}

/**
 * Set up keyboard listeners for iOS
 */
function setupKeyboardListeners(): void {
  Keyboard.addListener('keyboardWillShow', (info) => {
    document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    document.body.classList.add('keyboard-open');
  });

  Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.style.setProperty('--keyboard-height', '0px');
    document.body.classList.remove('keyboard-open');
  });
}

/**
 * Hide the splash screen
 */
export async function hideSplashScreen(): Promise<void> {
  if (!CapacitorPlatform.isNative()) return;

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('[SplashScreen] Hide error:', e);
  }
}

/**
 * Show the splash screen (useful for refresh/reload)
 */
export async function showSplashScreen(): Promise<void> {
  if (!CapacitorPlatform.isNative()) return;

  try {
    await SplashScreen.show({
      autoHide: true,
      fadeInDuration: 200,
      fadeOutDuration: 300,
      showDuration: 1000,
    });
  } catch (e) {
    console.warn('[SplashScreen] Show error:', e);
  }
}

/**
 * Get app info (version, build, etc.)
 */
export async function getAppInfo(): Promise<{
  name: string;
  id: string;
  build: string;
  version: string;
} | null> {
  if (!CapacitorPlatform.isNative()) return null;

  try {
    const info = await App.getInfo();
    return info;
  } catch (e) {
    console.warn('[App] Get info error:', e);
    return null;
  }
}

/**
 * Get the current app state
 */
export async function getAppState(): Promise<{ isActive: boolean } | null> {
  if (!CapacitorPlatform.isNative()) return { isActive: true };

  try {
    const state = await App.getState();
    return state;
  } catch (e) {
    console.warn('[App] Get state error:', e);
    return null;
  }
}

/**
 * Exit the app (Android only)
 */
export async function exitApp(): Promise<void> {
  if (!CapacitorPlatform.isAndroid()) return;
  
  await App.exitApp();
}

/**
 * Minimize the app (Android only)
 */
export async function minimizeApp(): Promise<void> {
  if (!CapacitorPlatform.isAndroid()) return;
  
  await App.minimizeApp();
}

/**
 * Open a URL in the system browser
 */
export async function openInBrowser(url: string): Promise<void> {
  // Use the browser's native behavior
  window.open(url, '_blank');
}

/**
 * Set status bar style
 */
export async function setStatusBarStyle(style: 'light' | 'dark'): Promise<void> {
  if (!CapacitorPlatform.isNative()) return;

  try {
    await StatusBar.setStyle({
      style: style === 'dark' ? Style.Dark : Style.Light,
    });
  } catch (e) {
    console.warn('[StatusBar] Set style error:', e);
  }
}

/**
 * Hide status bar
 */
export async function hideStatusBar(): Promise<void> {
  if (!CapacitorPlatform.isNative()) return;

  try {
    await StatusBar.hide();
  } catch (e) {
    console.warn('[StatusBar] Hide error:', e);
  }
}

/**
 * Show status bar
 */
export async function showStatusBar(): Promise<void> {
  if (!CapacitorPlatform.isNative()) return;

  try {
    await StatusBar.show();
  } catch (e) {
    console.warn('[StatusBar] Show error:', e);
  }
}

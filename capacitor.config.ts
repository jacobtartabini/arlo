import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jacobtartabini.arlo',
  appName: 'arlo-ai',
  webDir: 'dist',
  
  // Live reload configuration for development
  server: {
    url: 'https://arlo.jacobtartabini.com',
    cleartext: true,
  },
  
  // iOS-specific configuration (also applies to Mac Catalyst)
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
    // Use 'recommended' for Mac Catalyst to allow desktop-style content
    preferredContentMode: 'recommended',
  },
  
  // Android-specific configuration
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  
  // Plugin configurations
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      // Geolocation permission strings are in Info.plist
    },
  },
};

export default config;

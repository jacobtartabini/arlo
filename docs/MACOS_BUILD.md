# macOS Build Instructions

This document describes how to build and run the Arlo app as a native macOS application.

## Overview

Arlo supports two methods for running on macOS:

1. **Mac Catalyst** - Run the iOS app natively on macOS (recommended)
2. **Electron** - Full desktop app with enhanced native integrations (future)

## Prerequisites

- macOS 11.0 (Big Sur) or later
- Xcode 13.0 or later (from Mac App Store)
- Node.js 18+ and npm
- Apple Developer account (for distribution)

## Method 1: Mac Catalyst (Recommended)

Mac Catalyst allows the existing iOS app to run natively on macOS with minimal changes.

### Setup Steps

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd arlo-ai-command-center
   npm install
   ```

2. **Build the web assets**
   ```bash
   npm run build
   ```

3. **Sync with iOS/Capacitor**
   ```bash
   npx cap sync ios
   ```

4. **Open in Xcode**
   ```bash
   npx cap open ios
   ```

5. **Enable Mac Catalyst**
   - In Xcode, select the "App" target
   - Go to "General" → "Supported Destinations"
   - Click "+" and select "Mac (Mac Catalyst)"
   - Set "Deployment Info" → "macOS" to 11.0 or later

6. **Configure for macOS**
   - In the scheme selector (top of Xcode), select "My Mac (Mac Catalyst)"
   - Go to "Signing & Capabilities"
   - Ensure your Apple Developer team is selected
   - Add any required entitlements (see below)

7. **Run the app**
   - Press `Cmd + R` or click the Play button
   - The app will launch as a native macOS application

### Required Entitlements

Add these entitlements for full functionality:

- **App Sandbox** - Required for App Store distribution
- **Network Client** - For API calls
- **Location Services** - For maps/weather features
- **Push Notifications** - For alerts

### macOS-Specific Considerations

1. **Window Sizing**
   - The app respects macOS window resizing
   - Minimum window size is enforced via Xcode settings

2. **Menu Bar**
   - Standard macOS menu bar is automatically provided
   - Keyboard shortcuts (Cmd+N, Cmd+K, etc.) work automatically

3. **Touch Bar** (if applicable)
   - Not currently implemented; uses default system controls

4. **Haptics**
   - Haptic feedback is disabled on Mac (no Taptic Engine)

## Method 2: Electron (Future Enhancement)

Electron provides more desktop-native integrations:

- Custom menu bar
- System tray icon
- Native notifications with actions
- File system access
- Global keyboard shortcuts

### Setup (When Implemented)

```bash
# Install Electron support
npm install @capacitor-community/electron

# Add Electron platform
npx cap add @capacitor-community/electron

# Build and run
npm run build
npx cap sync @capacitor-community/electron
npx cap open @capacitor-community/electron
```

## Build Scripts

Add these scripts to your workflow:

```bash
# Build for Mac Catalyst
npm run build && npx cap sync ios

# Open in Xcode
npx cap open ios
```

## Distribution

### Direct Distribution

1. Archive in Xcode: `Product → Archive`
2. Distribute via "Developer ID" for direct downloads
3. Notarize the app using `xcrun notarytool`

### Mac App Store

1. Archive in Xcode: `Product → Archive`
2. Select "Distribute App" → "App Store Connect"
3. Follow App Store submission guidelines

## Troubleshooting

### "My Mac" not appearing in scheme selector

- Ensure Mac Catalyst is enabled in Supported Destinations
- Clean build folder: `Product → Clean Build Folder`
- Restart Xcode

### Signing issues

- Verify your Apple Developer account is active
- Check that bundle identifier matches your provisioning profile
- For development, use "Automatically manage signing"

### App crashes on launch

- Check Console.app for crash logs
- Ensure all required frameworks are embedded
- Verify minimum macOS version compatibility

### UI looks too small

- The app uses responsive design
- Mac Catalyst automatically adjusts UI scaling
- If issues persist, check `preferredContentMode` in capacitor.config.ts

## Platform Detection in Code

The app automatically detects Mac Catalyst:

```typescript
import { CapacitorPlatform } from '@/lib/capacitor';

// Check if running on macOS
if (CapacitorPlatform.isMacOS()) {
  // macOS-specific behavior
}

// Check if desktop (Mac Catalyst, Electron, or desktop web)
if (CapacitorPlatform.isDesktop()) {
  // Desktop-specific behavior
}
```

## Keyboard Shortcuts

The app supports these keyboard shortcuts on macOS:

| Shortcut | Action |
|----------|--------|
| `Cmd + 1-9` | Navigate to sections |
| `Cmd + K` | Open command palette |
| `Cmd + N` | New note |
| `Cmd + ,` | Open settings |
| `Cmd + Shift + F` | Global search |

## Resources

- [Mac Catalyst Documentation](https://developer.apple.com/mac-catalyst/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Human Interface Guidelines - macOS](https://developer.apple.com/design/human-interface-guidelines/macos)

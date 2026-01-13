# iOS Native App Build Instructions

This document explains how to build and run Arlo as a native iOS app using Capacitor.

## Prerequisites

- **macOS** with Xcode 14+ installed
- **Node.js** 18+ and npm
- **CocoaPods** (`sudo gem install cocoapods`)
- Apple Developer account (for device testing)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone from your GitHub repo (after exporting from Lovable)
git clone <your-repo-url>
cd arlo-ai-command-center
npm install
```

### 2. Add iOS Platform

```bash
npx cap add ios
```

### 3. Build and Sync

```bash
npm run build
npx cap sync ios
```

### 4. Open in Xcode

```bash
npx cap open ios
```

### 5. Run on Simulator or Device

In Xcode:
1. Select your target device/simulator
2. Click the Run button (▶)

## Development with Live Reload

The `capacitor.config.ts` is configured for live reload from the Lovable preview URL. This means:

- Changes in Lovable appear instantly in the iOS app
- No need to rebuild for UI changes
- Perfect for rapid development

To use production builds instead, comment out the `server` section in `capacitor.config.ts`.

## Building for Production

1. Remove or comment out the `server.url` in `capacitor.config.ts`
2. Build the web assets: `npm run build`
3. Sync to iOS: `npx cap sync ios`
4. In Xcode, select "Any iOS Device" and build for release

## Native Permissions

The app uses these native capabilities (configured in `ios/App/App/Info.plist`):

- **Location**: For maps and location-based features
- **Microphone**: For voice commands
- **Push Notifications**: For alerts and reminders
- **Camera** (optional): For future features

## Troubleshooting

### Build fails with signing errors
- Open Xcode → Select the App target → Signing & Capabilities
- Select your development team

### App shows white screen
- Check that `npm run build` completed successfully
- Run `npx cap sync ios` again
- Check Xcode console for JavaScript errors

### Push notifications not working
- Ensure you have a valid APNs certificate
- Check that the app has notification permissions

## Architecture Notes

The iOS app uses:
- `@capacitor/geolocation` for native location (falls back to web API)
- `@capacitor/push-notifications` for native push (falls back to web push)
- `@capacitor/haptics` for native haptic feedback
- `@capacitor/preferences` for native storage (falls back to localStorage)

All native features have web fallbacks, so the same codebase works on web and iOS.

# Arlo for Gmail - Chrome Extension

A Chrome extension companion for Arlo that integrates Gmail directly into your Arlo inbox.

## Features

- **Seamless Authentication**: Uses the same Tailscale JWT authentication as the main Arlo app
- **Gmail Integration**: Connect your Gmail account and sync emails to Arlo
- **Send to Arlo**: Select any email thread in Gmail and send it to your Arlo inbox
- **Unified Database**: All data syncs to the same Supabase database as the main Arlo app

## Setup

### Prerequisites

1. Node.js 18+ installed
2. Access to the Arlo Tailscale network (for authentication)
3. The main Arlo app should be set up and working

### Development Setup

1. Install dependencies:
   ```bash
   cd chrome-extension
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension/dist` folder

### Environment Variables

The extension uses the same backend as Arlo. No additional secrets are needed in the extension itself - all sensitive operations are handled by the existing Supabase Edge Functions.

### OAuth Setup

The extension reuses the existing Gmail OAuth configuration from Arlo. Ensure these are set in your Supabase secrets:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`

Add the extension's redirect URL to your Google Cloud Console OAuth settings:
- `https://<extension-id>.chromiumapp.org/` (get this from chrome://extensions after loading)

## Development

### Available Scripts

- `npm run build` - Build for production
- `npm run watch` - Build with watch mode for development
- `npm run clean` - Remove dist folder

### Project Structure

```
chrome-extension/
├── src/
│   ├── popup/           # Extension popup UI
│   ├── background/      # Service worker
│   ├── content/         # Gmail content scripts
│   ├── lib/             # Shared utilities
│   └── styles/          # CSS styles
├── public/
│   └── icons/           # Extension icons
├── manifest.json        # Extension manifest
└── dist/                # Built extension (git-ignored)
```

## Architecture

### Authentication Flow

1. User clicks "Connect to Arlo" in the popup
2. Extension opens Tailscale auth endpoint in a new tab
3. After successful auth, JWT is stored in `chrome.storage.session`
4. All API calls include the JWT in Authorization header

### Gmail Integration

1. Content script injects a sidebar/button into Gmail
2. User selects an email thread and clicks "Send to Arlo"
3. Extension calls Gmail API to fetch thread details
4. Data is sent to the `inbox-sync` edge function
5. Thread appears in Arlo's unified inbox

### Security

- JWT tokens are stored in `chrome.storage.session` (cleared when browser closes)
- No tokens are stored in localStorage or cookies
- All API calls go through Supabase Edge Functions
- Extension only requests necessary permissions

## Troubleshooting

### "Not connected to Arlo"
- Ensure you're on the Tailscale network
- Try clicking "Connect to Arlo" again

### "Gmail not connected"
- Disconnect and reconnect Gmail from the popup
- Check that OAuth credentials are configured correctly

### Extension not loading
- Check `chrome://extensions/` for errors
- Ensure you're loading the `dist` folder, not `src`

Cordova wrapper for Sort_EMS with DataWedge integration

## Overview

This folder contains a minimal Cordova project wrapper that loads the web frontend and a Cordova plugin that listens for Zebra DataWedge intents and forwards RFID tag data into the WebView as a `datawedge` CustomEvent.

Files of interest

- `www/index.html` - simple redirect to your dev frontend (`http://192.168.1.37:3001/`) for development.
- `plugins/cordova-plugin-datawedge-intent` - Cordova plugin that listens for DataWedge broadcasts and dispatches events into the WebView.

Capacitor option:
If you'd prefer to migrate to Capacitor instead of Cordova, there is a Capacitor wrapper in `mobile/capacitor` which reuses the cordova/www assets by default and includes a Capacitor plugin in `mobile/capacitor/plugins/capacitor-plugin-datawedge`.
Follow `mobile/capacitor/README.md` for steps to add the Android platform and install the local plugin.

- `plugins/cordova-plugin-datawedge-intent` - Cordova plugin that listens for DataWedge broadcasts and dispatches events into the WebView.

How to install the local plugin (on your machine):

1. Ensure your PATH includes the npm global bin (e.g., export PATH=$PATH:/usr/local/Cellar/node/25.2.1/bin).
2. From the `mobile/cordova` folder, run:

```bash
./scripts/add-datawedge-plugin.sh
```

This will pack the plugin, install it into `node_modules`, then call the Cordova CLI to add it to the project. If the install fails due to `node_modules` symlink issues, you can also use:

```bash
cordova plugin add cordova-plugin-datawedge-intent --searchpath ./plugins --verbose
```

If that still doesn't work, run the following as a manual fallback:

```bash
# 1) Remove existing plugin references
cordova plugin rm cordova-plugin-datawedge-intent || true
rm -rf node_modules/cordova-plugin-datawedge-intent
# 2) Pack plugin
cd plugins/cordova-plugin-datawedge-intent
pkg=$(npm pack --silent)
cd ../..
# 3) Install tgz to node_modules
npm install --no-audit --no-fund "plugins/cordova-plugin-datawedge-intent/$pkg"
# 4) Add plugin via Cordova
cordova plugin add cordova-plugin-datawedge-intent --verbose
```

If you still run into issues, please share the `cordova plugin add` output so we can debug further.

## Development

Requirements:

- Node.js and npm
- Cordova CLI (`npm install -g cordova`)
- Android SDK + Java + environment set up for Cordova builds

Scaffold and build (from this folder):

```bash
cd mobile/cordova
cordova platform add android
# install plugin locally
cordova plugin add ./plugins/cordova-plugin-datawedge-intent
# build
cordova build android
# run on device (or use Android Studio to open platforms/android)
cordova run android --device
```

## Notes

- The plugin registers a BroadcastReceiver at runtime for likely DataWedge broadcast actions and forwards the payload into the WebView as `window.dispatchEvent(new CustomEvent('datawedge', { detail: { tag: '...' } }));`.
- The frontend `ScannerPage.tsx` already listens for `datawedge` events and will add scanned tags to the current scan session automatically.
- For development, `www/index.html` redirects to `http://192.168.1.37:3001/`. Change that value if your dev server runs elsewhere or if you prefer bundling the frontend into the Cordova `www` folder for release builds.

## DataWedge profile

Create a DataWedge profile on the device and associate it with Chrome or the Cordova app package name (once installed). Configure RFID input and Keystroke Output disabled (we use intents). Instead, enable the following in the DataWedge profile:

- Intent output (set intent action: e.g. `com.symbol.datawedge.api.RESULT_ACTION`)
- Intent delivery to Broadcast Receiver

Example DataWedge intent keys: `com.symbol.datawedge.data_string` or `com.symbol.datawedge.raw_data`. The plugin tries several common keys.

## Security

This plugin enables `allow-intent` and `access origin='*'` by default for development. Make sure to restrict origins and intents appropriately for production.

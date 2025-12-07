# Capacitor DataWedge Plugin

This Capacitor plugin listens for DataWedge broadcasts on Android and emits `scan` events to the web side.

To build & install (from `mobile/capacitor`):

1. Install dependencies:

```bash
npm install
```

2. Build your web app (Vite) into `cordova/www` (the existing Cordova web dir is reused):

```bash
npm run build
```

3. Add Android platform (first time only):

```bash
npx cap add android
```

4. Add plugin to Capacitor Android: from the root `mobile/capacitor` run `npx cap sync` (which will include the plugin code)

5. Open in Android Studio:

```bash
npx cap open android
```

The plugin will register for DataWedge intents and forward them via `notifyListeners("scan", { tag: "..." })`.

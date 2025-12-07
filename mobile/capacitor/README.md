# Capacitor wrapper for Sort EMS

This folder contains a minimal Capacitor wrapper that reuses the `cordova/www` web assets by default. The build and plugin install flow:

1. Build frontend to `mobile/cordova/www`:

```bash
# from project root
cd frontend
npm install
npm run build
```

2. Install Capacitor deps and add Android:

```bash
cd mobile/capacitor
npm install
npx cap init
npx cap add android
```

3. Install local DataWedge plugin (pack and install from plugin folder):

```bash
npm run install:plugin
npm run cap:sync
```

4. Build & run in Android Studio:

```bash
npx cap open android
```

The plugin `@medicd21/capacitor-datawedge` added under `mobile/capacitor/plugins` registers an Android BroadcastReceiver and dispatches `scan` events into Capacitor via `notifyListeners('scan', {...})`.

# Sort EMS - Android WebView Application

Android native application with embedded WebView and Zebra RFID SDK integration.

## Overview

This is a native Android application that:
- Embeds the Sort EMS frontend web app in a WebView
- Provides direct integration with Zebra RFID API3 SDK
- Supports USB and Bluetooth RFID readers
- Implements duplicate tag detection and continuous scanning
- Exposes JavaScript bridge for web-to-native RFID communication

## Prerequisites

- **Android Studio**: Latest stable version (2023.1.1+)
- **JDK**: Java 17
- **Android SDK**: API Level 26+ (Android 8.0+)
- **Zebra RFID SDK**: Version 2.0.5.226 (included in project)

## Project Structure

```
mobile/android-webview/
├── app/
│   ├── src/main/
│   │   ├── java/com/medicd21/sortems/
│   │   │   └── MainActivity.java          # Main activity with RFID integration
│   │   ├── res/
│   │   │   ├── layout/activity_main.xml   # Main layout
│   │   │   └── values/...                  # Resources
│   │   ├── assets/www/                     # Web app assets
│   │   │   └── index.html                  # Frontend entry point
│   │   └── AndroidManifest.xml
│   ├── libs/                                # Zebra RFID AAR libraries
│   └── build.gradle
├── build.gradle
└── gradle/wrapper/
```

## Building the App

### 1. Open in Android Studio

```bash
cd mobile/android-webview
# Open this directory in Android Studio
```

### 2. Sync Gradle

Android Studio should automatically prompt you to sync Gradle files. If not:
- Click **File** → **Sync Project with Gradle Files**

### 3. Build the APK

**Debug Build:**
```bash
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

**Release Build:**
```bash
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release-unsigned.apk
```

### 4. Install to Device/Emulator

```bash
./gradlew installDebug
```

Or use Android Studio's **Run** button (Shift+F10).

## Running in Android Emulator

### Create Emulator (Android Studio)

1. **Open AVD Manager**: Tools → Device Manager
2. **Create Virtual Device**:
   - Phone: Pixel 6 or Pixel 7
   - System Image: API 35 (Android 15.0) or API 34 (Android 14.0)
   - Download system image if needed
3. **Configure**:
   - RAM: 4GB minimum
   - Internal Storage: 8GB minimum
4. **Launch Emulator**

### Run App on Emulator

```bash
# List available devices
adb devices

# Install and run
./gradlew installDebug
adb shell am start -n com.medicd21.sortems/.MainActivity
```

**Note**: RFID hardware won't be available in emulator. The app will still run but show "No RFID reader found" when attempting to scan.

## Testing RFID Functionality

### Hardware Requirements

- **Zebra TC22 or TC27** Mobile Computer with RFID Sled
- **Zebra RFD40** RFID UHF Sled
- **Zebra RFD90** UHF RFID Handheld Reader
- Or any Zebra RFID reader supporting API3 SDK

### USB Connection Testing

1. Connect Zebra RFID device via USB
2. Grant USB permissions when prompted
3. App will automatically detect and connect to USB reader
4. Check logcat for connection messages:
   ```bash
   adb logcat -s SortEMS-WebView:*
   ```

### Bluetooth Connection Testing

1. Pair Zebra RFID reader via Bluetooth (Settings → Bluetooth)
2. Grant Bluetooth permissions in app settings
3. App will detect Bluetooth readers
4. Check logs for "Available readers" messages

### RFID Scanning Workflow

1. **Open App** → Loads web frontend
2. **Navigate to Scanner Page** (burger menu → Scanner)
3. **Click "Start Scanning"** button (or it auto-starts)
4. **Scan RFID tags** with the Zebra reader
5. **View Results** in the RFID overlay panel at bottom of screen

### Debug RFID Overlay

The app includes a built-in RFID debug overlay that shows:
- Connection status (green = connected, red = disconnected)
- Tag count captured in current session
- List of scanned tag IDs
- Pause/Resume and Clear buttons

The overlay is automatically injected into the web page.

## Configuration

### API Endpoint

Update the API base URL in your frontend's `.env` file:

```env
VITE_API_URL=http://YOUR_SERVER_IP:8000
```

For emulator accessing host machine:
```env
VITE_API_URL=http://10.0.2.2:8000  # Android emulator special alias
```

For physical device on same network:
```env
VITE_API_URL=http://192.168.1.XXX:8000  # Your computer's local IP
```

### Network Security Config

The app allows cleartext HTTP traffic for local development (see `res/xml/network_security_config.xml`). For production, use HTTPS only.

## Troubleshooting

### "No RFID reader found"

**Causes:**
- No physical Zebra RFID device connected
- USB permissions not granted
- Bluetooth not paired or permissions denied

**Solutions:**
1. Check USB cable connection
2. Check Bluetooth pairing in Android settings
3. Grant permissions when prompted
4. Check logcat: `adb logcat -s SortEMS-WebView:*`

### Tags Not Scanning

**Causes:**
- Low antenna power
- Tags out of range
- Reader not in correct mode
- Tags already scanned (duplicate detection active)

**Solutions:**
1. Check antenna power is set to max (logged in debug)
2. Hold reader closer to tags (< 1 meter)
3. Check logcat for "Duplicate tag filtered" messages
4. Restart scanning to clear duplicate cache

### WebView Not Loading

**Causes:**
- Missing web assets in `app/src/main/assets/www/`
- JavaScript errors in frontend

**Solutions:**
1. Build frontend: `cd frontend && npm run build`
2. Copy dist to assets: `cp -r dist/* ../mobile/android-webview/app/src/main/assets/www/`
3. Check WebView console in logcat: `adb logcat -s SortEMS-WebView:D chromium:I`

### Connection Retries Failing

The app now includes retry logic with exponential backoff (3 attempts). Check logs for:
```
Connection attempt 1/3 to <reader>
Connection attempt 2/3 to <reader>
Connection attempt 3/3 to <reader>
Successfully connected to <reader>
```

## Features

### ✅ Implemented

- [x] Direct Zebra RFID API3 SDK integration
- [x] USB and Bluetooth reader support
- [x] Continuous inventory scanning mode
- [x] Duplicate tag detection (2-second window)
- [x] Connection retry logic with exponential backoff
- [x] Comprehensive error logging
- [x] JavaScript bridge for web integration
- [x] Auto RFID overlay injection
- [x] Multi-antenna support with max power
- [x] Tag buffer polling (300ms intervals)

### 🔨 Known Issues

- iOS version not implemented
- No offline mode (requires network for API calls)
- Emulator cannot test RFID hardware

## Logging

### Enable Verbose Logging

```bash
adb shell setprop log.tag.SortEMS-WebView VERBOSE
adb logcat -s SortEMS-WebView:V
```

### View RFID Events Only

```bash
adb logcat | grep -E "RFID|tag|reader|antenna"
```

### View WebView Console

```bash
adb logcat -s chromium:I
```

## Performance Tuning

### Antenna Power
- Default: Maximum available (auto-detected from reader capabilities)
- Fallback: Index 30 if capabilities cannot be read
- Location: `MainActivity.java` lines 490-505

### Duplicate Detection Window
- Default: 2000ms (2 seconds)
- Adjust: `DUPLICATE_WINDOW_MS` in MainActivity.java line 227

### Polling Interval
- Default: 300ms
- Adjust: `startPolling()` method line 639

## JavaScript Bridge API

The app exposes native RFID functions to the web frontend:

### Start Scanning
```javascript
if (window.AndroidRfid) {
  window.AndroidRfid.startRfidScan();
}
```

### Stop Scanning
```javascript
if (window.AndroidRfid) {
  window.AndroidRfid.stopRfidScan();
}
```

### Listen for Tags
```javascript
window.addEventListener('rfidTag', (event) => {
  const tagId = event.detail.id;
  console.log('Scanned tag:', tagId);
});
```

### Listen for Status
```javascript
window.addEventListener('rfidStatus', (event) => {
  const { message, ok } = event.detail;
  console.log(`Status: ${message} (${ok ? 'OK' : 'ERROR'})`);
});
```

## Building for Production

1. **Update version** in `app/build.gradle`:
   ```gradle
   versionCode 2
   versionName '1.1'
   ```

2. **Disable debug features**:
   - Set `WebView.setWebContentsDebuggingEnabled(false)` in MainActivity.java
   - Remove or disable RFID debug overlay

3. **Configure signing** (create keystore):
   ```bash
   keytool -genkey -v -keystore sort-ems.keystore -alias sortems -keyalg RSA -keysize 2048 -validity 10000
   ```

4. **Add to `app/build.gradle`**:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('sort-ems.keystore')
               storePassword 'YOUR_PASSWORD'
               keyAlias 'sortems'
               keyPassword 'YOUR_PASSWORD'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

5. **Build release APK**:
   ```bash
   ./gradlew assembleRelease
   ```

## License

Proprietary - MedicD21 / Sort EMS

## Support

For issues related to:
- **RFID SDK**: Contact Zebra Support
- **App functionality**: Check project GitHub issues
- **Build problems**: Ensure all prerequisites are met

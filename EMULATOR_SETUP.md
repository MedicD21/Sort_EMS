# Android/iOS Emulator Setup Guide for VSCode

This guide will help you set up Android and iOS emulators to work with VSCode extensions.

## Current Status

- ✅ Android SDK installed at: `~/Library/Android/sdk/`
- ✅ Android emulator binary found
- ✅ ADB (Android Debug Bridge) installed
- ❌ **No Android Virtual Devices (AVDs) created yet** ← This is your issue
- ❌ Xcode/iOS Simulator not fully configured

## Android Emulator Setup

### Option 1: Create AVD using Android Studio (Recommended)

This is the easiest method and gives you a GUI to manage emulators.

1. **Install Android Studio** (if not already installed):
   - Download from: https://developer.android.com/studio
   - Open the DMG and drag to Applications

2. **Open Android Studio**:
   ```bash
   open -a "Android Studio"
   ```

3. **Open Device Manager**:
   - Click **Tools** → **Device Manager** (or the device icon in toolbar)
   - Or use: **View** → **Tool Windows** → **Device Manager**

4. **Create a New Virtual Device**:
   - Click **"Create Device"** button
   - Select a device definition:
     - **Phone**: Pixel 7 or Pixel 6 (recommended)
     - **Tablet**: Pixel Tablet (if needed)
   - Click **Next**

5. **Download System Image**:
   - Select a system image:
     - **Recommended**: API 34 (Android 14.0) with Google APIs
     - **Latest**: API 35 (Android 15.0)
     - Choose **x86_64** for Intel Macs or **arm64-v8a** for Apple Silicon
   - Click **Download** next to the image
   - Wait for download to complete
   - Click **Next**

6. **Configure AVD**:
   - AVD Name: `Pixel_7_API_34` (or your choice)
   - Startup orientation: Portrait
   - **Advanced Settings** (optional):
     - RAM: 4096 MB (4GB) minimum
     - Internal Storage: 8192 MB (8GB)
     - SD Card: 1024 MB (if needed)
     - Graphics: **Hardware - GLES 2.0** (faster)
   - Click **Finish**

7. **Test the Emulator**:
   - In Device Manager, click the **▶ Play** button next to your AVD
   - Wait for emulator to boot (first boot takes 2-3 minutes)
   - You should see the Android home screen

### Option 2: Create AVD using Command Line

If you prefer command line or don't want to install Android Studio:

1. **Set up environment variables** (add to `~/.zshrc` or `~/.bash_profile`):
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
   ```

2. **Reload shell**:
   ```bash
   source ~/.zshrc  # or source ~/.bash_profile
   ```

3. **List available system images**:
   ```bash
   sdkmanager --list | grep "system-images"
   ```

4. **Download a system image** (choose one):
   ```bash
   # For Intel Macs (x86_64):
   sdkmanager "system-images;android-34;google_apis;x86_64"

   # For Apple Silicon Macs (M1/M2/M3):
   sdkmanager "system-images;android-34;google_apis;arm64-v8a"
   ```

5. **Create an AVD**:
   ```bash
   # For Intel Macs:
   avdmanager create avd \
     --name "Pixel_7_API_34" \
     --package "system-images;android-34;google_apis;x86_64" \
     --device "pixel_7"

   # For Apple Silicon:
   avdmanager create avd \
     --name "Pixel_7_API_34" \
     --package "system-images;android-34;google_apis;arm64-v8a" \
     --device "pixel_7"
   ```

6. **List your AVDs**:
   ```bash
   emulator -list-avds
   ```

7. **Start the emulator**:
   ```bash
   emulator -avd Pixel_7_API_34 &
   ```

### Verify Android Emulator is Running

Once your emulator is running:

```bash
# Check connected devices
adb devices

# Should show something like:
# List of devices attached
# emulator-5554   device
```

---

## iOS Simulator Setup (macOS only)

### Install Xcode

1. **Install Xcode from App Store**:
   - Open **App Store**
   - Search for **Xcode**
   - Click **Install** (it's ~15GB, may take a while)
   - Or download from: https://developer.apple.com/xcode/

2. **Install Xcode Command Line Tools**:
   ```bash
   sudo xcode-select --install
   ```

3. **Accept Xcode License**:
   ```bash
   sudo xcodebuild -license accept
   ```

4. **Open Xcode** (first-time setup):
   ```bash
   open -a Xcode
   ```
   - Let it install additional components
   - Close Xcode when done

### Verify iOS Simulator

1. **List available simulators**:
   ```bash
   xcrun simctl list devices available
   ```

2. **Launch a simulator**:
   ```bash
   # Open Simulator app
   open -a Simulator

   # Or boot a specific device
   xcrun simctl boot "iPhone 15 Pro"
   open -a Simulator
   ```

### Create Custom iOS Simulators (Optional)

You can manage simulators through Xcode:

1. Open Xcode
2. Go to **Window** → **Devices and Simulators** (⇧⌘2)
3. Click **Simulators** tab
4. Click **+** to add a new simulator
5. Choose:
   - Device Type: iPhone 15, iPhone 15 Pro, iPad Pro, etc.
   - iOS Version: Latest available
   - Name: Custom name
6. Click **Create**

---

## VSCode Extension Setup

### Install VSCode Extension

1. **Install "Android iOS Emulator" extension**:
   - Open VSCode
   - Press `Cmd+Shift+X` (Extensions)
   - Search for: **"Android iOS Emulator"**
   - Install by **DiemasMichiels**

### Configure Extension

The extension should auto-detect your emulators once they're created. If not:

1. **Open Settings**:
   - Press `Cmd+,`
   - Search for "emulator"

2. **Set Android Paths** (if needed):
   ```json
   {
     "emulator.emulatorPath": "/Users/YOUR_USERNAME/Library/Android/sdk/emulator/emulator",
     "emulator.adbPath": "/usr/local/bin/adb"
   }
   ```

3. **Reload VSCode**:
   - Press `Cmd+Shift+P`
   - Type: "Reload Window"
   - Press Enter

### Use the Extension

1. **Open Command Palette**: `Cmd+Shift+P`
2. **Type**: "Emulator"
3. **Select**:
   - `Emulator: Run Android Emulator` - Shows list of AVDs
   - `Emulator: Run iOS Simulator` - Shows list of iOS simulators

The extension will list all available emulators/simulators you created.

---

## Quick Start Script for Android

Save this as `start-android-emulator.sh` in your project root:

```bash
#!/bin/bash

# Set Android SDK path
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

echo "Available Android Virtual Devices:"
$ANDROID_HOME/emulator/emulator -list-avds

echo ""
read -p "Enter AVD name to start (or press Enter for first AVD): " AVD_NAME

if [ -z "$AVD_NAME" ]; then
    # Get first AVD if none specified
    AVD_NAME=$($ANDROID_HOME/emulator/emulator -list-avds | head -1)
fi

if [ -z "$AVD_NAME" ]; then
    echo "No AVDs found. Please create one using Android Studio."
    exit 1
fi

echo "Starting emulator: $AVD_NAME"
$ANDROID_HOME/emulator/emulator -avd "$AVD_NAME" &

echo "Waiting for emulator to boot..."
adb wait-for-device
echo "Emulator is ready!"
```

Make it executable:
```bash
chmod +x start-android-emulator.sh
./start-android-emulator.sh
```

---

## Quick Start Script for iOS

Save this as `start-ios-simulator.sh`:

```bash
#!/bin/bash

echo "Available iOS Simulators:"
xcrun simctl list devices available | grep -E "iPhone|iPad" | grep -v "unavailable"

echo ""
read -p "Enter device name (e.g., 'iPhone 15 Pro'): " DEVICE_NAME

if [ -z "$DEVICE_NAME" ]; then
    DEVICE_NAME="iPhone 15 Pro"
fi

echo "Starting simulator: $DEVICE_NAME"
xcrun simctl boot "$DEVICE_NAME" 2>/dev/null || echo "Already running or booting..."
open -a Simulator

echo "Simulator is ready!"
```

Make it executable:
```bash
chmod +x start-ios-simulator.sh
./start-ios-simulator.sh
```

---

## Troubleshooting

### "No emulators found" in VSCode Extension

**Cause**: No AVDs created yet

**Solution**:
1. Create at least one AVD using Android Studio or command line
2. Verify with: `emulator -list-avds` (should show at least one)
3. Reload VSCode

### Emulator fails to start with "HAXM" error (Intel Macs)

**Cause**: Intel HAXM (Hardware Accelerated Execution Manager) not installed

**Solution**:
```bash
# Install HAXM via SDK Manager
sdkmanager --install "extras;intel;Hardware_Accelerated_Execution_Manager"

# Or download manually from:
# https://github.com/intel/haxm/releases
```

### Emulator is slow/laggy

**Solutions**:
1. Increase RAM in AVD settings (4GB minimum)
2. Enable Hardware Graphics:
   - Edit AVD in Device Manager
   - Advanced Settings → Graphics → **Hardware - GLES 2.0**
3. Close other applications

### "command not found: emulator"

**Cause**: Android SDK paths not in PATH

**Solution**:
Add to `~/.zshrc` or `~/.bash_profile`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Then: `source ~/.zshrc`

### iOS Simulator not found

**Cause**: Xcode not installed or command line tools not configured

**Solution**:
```bash
# Install command line tools
sudo xcode-select --install

# Set Xcode path
sudo xcode-select --switch /Applications/Xcode.app

# Verify
xcrun simctl list devices
```

---

## Testing Your Setup

### Test Android Emulator with Sort EMS App

1. **Start emulator**:
   ```bash
   emulator -avd Pixel_7_API_34 &
   adb wait-for-device
   ```

2. **Build and install app**:
   ```bash
   cd mobile/android-webview
   ./gradlew installDebug
   ```

3. **Launch app**:
   ```bash
   adb shell am start -n com.medicd21.sortems/.MainActivity
   ```

4. **View logs**:
   ```bash
   adb logcat -s SortEMS-WebView:V
   ```

### Test iOS Simulator (when iOS app is ready)

Currently, Sort EMS only has an Android implementation. iOS support is not yet implemented.

---

## Recommended AVD Configuration for Sort EMS

**Device**: Pixel 7 or Pixel 6
**System Image**: API 34 (Android 14.0) with Google APIs
**RAM**: 4096 MB (4GB)
**Internal Storage**: 8192 MB (8GB)
**Graphics**: Hardware - GLES 2.0

This configuration provides good performance for testing the RFID-enabled Sort EMS app.

---

## Next Steps

1. ✅ Create at least one Android AVD (using Android Studio or command line)
2. ✅ Verify emulator appears in VSCode extension
3. ✅ Start emulator and install Sort EMS app
4. ✅ Test RFID functionality (will show "No reader found" in emulator, which is expected)
5. ✅ Use physical Zebra device for actual RFID testing

For production RFID testing, you'll need a physical Zebra TC22/TC27 device with RFID sled.

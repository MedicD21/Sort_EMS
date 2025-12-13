#!/bin/bash

# Quick setup script for creating an Android Virtual Device (AVD)
# for Sort EMS development

set -e

echo "========================================"
echo "Sort EMS - Android Emulator Quick Setup"
echo "========================================"
echo ""

# Detect CPU architecture
if [[ $(uname -m) == 'arm64' ]]; then
    ARCH="arm64-v8a"
    echo "✓ Detected Apple Silicon (M1/M2/M3)"
else
    ARCH="x86_64"
    echo "✓ Detected Intel Mac"
fi

# Set Android SDK path
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin

# Check if Android SDK is installed
if [ ! -d "$ANDROID_HOME" ]; then
    echo ""
    echo "❌ Android SDK not found at: $ANDROID_HOME"
    echo ""
    echo "Please install Android Studio from:"
    echo "https://developer.android.com/studio"
    echo ""
    exit 1
fi

echo "✓ Android SDK found at: $ANDROID_HOME"
echo ""

# Check if sdkmanager is available
if ! command -v sdkmanager &> /dev/null; then
    echo "❌ sdkmanager not found in PATH"
    echo ""
    echo "Please install Android SDK Command-line Tools:"
    echo "1. Open Android Studio"
    echo "2. Go to Settings/Preferences → Appearance & Behavior → System Settings → Android SDK"
    echo "3. Click 'SDK Tools' tab"
    echo "4. Check 'Android SDK Command-line Tools (latest)'"
    echo "5. Click 'Apply' and wait for installation"
    echo ""
    exit 1
fi

echo "✓ SDK Manager found"
echo ""

# Define system image
API_LEVEL="34"
IMAGE_TYPE="google_apis"
SYSTEM_IMAGE="system-images;android-${API_LEVEL};${IMAGE_TYPE};${ARCH}"

echo "Target System Image: Android ${API_LEVEL} (${IMAGE_TYPE}) for ${ARCH}"
echo ""

# Check if system image is installed
if ! sdkmanager --list_installed | grep -q "$SYSTEM_IMAGE"; then
    echo "📦 System image not installed. Downloading..."
    echo "This may take a few minutes (system image is ~500MB)"
    echo ""

    # Accept licenses
    yes | sdkmanager --licenses 2>/dev/null || true

    # Install system image
    sdkmanager "$SYSTEM_IMAGE"

    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ System image downloaded successfully"
    else
        echo ""
        echo "❌ Failed to download system image"
        exit 1
    fi
else
    echo "✓ System image already installed"
fi

echo ""

# Define AVD name
AVD_NAME="SortEMS_Pixel7_API${API_LEVEL}"

# Check if AVD already exists
if $ANDROID_HOME/emulator/emulator -list-avds | grep -q "^${AVD_NAME}$"; then
    echo "⚠️  AVD '${AVD_NAME}' already exists!"
    echo ""
    read -p "Delete and recreate? (y/n): " RECREATE

    if [[ $RECREATE == "y" || $RECREATE == "Y" ]]; then
        avdmanager delete avd --name "$AVD_NAME"
        echo "✓ Deleted existing AVD"
    else
        echo ""
        echo "Using existing AVD. Exiting."
        echo ""
        echo "To start the emulator, run:"
        echo "  emulator -avd $AVD_NAME &"
        exit 0
    fi
fi

echo "Creating AVD: $AVD_NAME"
echo ""

# Create AVD
echo "no" | avdmanager create avd \
    --name "$AVD_NAME" \
    --package "$SYSTEM_IMAGE" \
    --device "pixel_7"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ AVD created successfully!"
else
    echo ""
    echo "❌ Failed to create AVD"
    exit 1
fi

# Configure AVD settings for better performance
CONFIG_FILE="$HOME/.android/avd/${AVD_NAME}.avd/config.ini"

if [ -f "$CONFIG_FILE" ]; then
    echo ""
    echo "Configuring AVD for optimal performance..."

    # Backup original config
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"

    # Update settings
    # Set RAM to 4GB
    sed -i '' 's/hw.ramSize=.*/hw.ramSize=4096/' "$CONFIG_FILE"

    # Enable hardware graphics
    if ! grep -q "hw.gpu.enabled" "$CONFIG_FILE"; then
        echo "hw.gpu.enabled=yes" >> "$CONFIG_FILE"
    else
        sed -i '' 's/hw.gpu.enabled=.*/hw.gpu.enabled=yes/' "$CONFIG_FILE"
    fi

    # Set internal storage to 8GB
    if ! grep -q "disk.dataPartition.size" "$CONFIG_FILE"; then
        echo "disk.dataPartition.size=8192M" >> "$CONFIG_FILE"
    else
        sed -i '' 's/disk.dataPartition.size=.*/disk.dataPartition.size=8192M/' "$CONFIG_FILE"
    fi

    echo "✓ AVD configured with:"
    echo "  - RAM: 4GB"
    echo "  - Internal Storage: 8GB"
    echo "  - Hardware Graphics: Enabled"
fi

echo ""
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "Your Android emulator is ready to use."
echo ""
echo "To start the emulator:"
echo "  $ANDROID_HOME/emulator/emulator -avd $AVD_NAME &"
echo ""
echo "Or use the VSCode extension:"
echo "  1. Press Cmd+Shift+P"
echo "  2. Type 'Emulator: Run Android Emulator'"
echo "  3. Select '$AVD_NAME'"
echo ""
echo "To verify emulator is running:"
echo "  adb devices"
echo ""
echo "To install Sort EMS app to emulator:"
echo "  cd mobile/android-webview"
echo "  ./gradlew installDebug"
echo ""

# Ask if user wants to start emulator now
read -p "Start the emulator now? (y/n): " START_NOW

if [[ $START_NOW == "y" || $START_NOW == "Y" ]]; then
    echo ""
    echo "Starting emulator in background..."
    $ANDROID_HOME/emulator/emulator -avd "$AVD_NAME" &

    echo ""
    echo "Waiting for emulator to boot..."
    adb wait-for-device

    echo ""
    echo "✓ Emulator is ready!"
    echo ""
    echo "You can now install the app with:"
    echo "  cd mobile/android-webview && ./gradlew installDebug"
fi

echo ""
echo "Done!"

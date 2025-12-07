#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing local DataWedge plugin into Cordova project..."

if [ ! -d "plugins/cordova-plugin-datawedge-intent" ]; then
  echo "Plugin folder plugins/cordova-plugin-datawedge-intent missing."
  echo "Make sure the plugin files are present under mobile/cordova/plugins/cordova-plugin-datawedge-intent"
  exit 1
fi

echo "Packing plugin as tarball..."
pushd plugins/cordova-plugin-datawedge-intent >/dev/null
pkg_file=$(npm pack --silent)
popd >/dev/null

echo "Installing plugin tarball into node_modules..."
npm install --no-audit --no-fund "plugins/cordova-plugin-datawedge-intent/$pkg_file" || true

echo "Adding plugin to Cordova project..."
cordova plugin add cordova-plugin-datawedge-intent --searchpath ./plugins --verbose

echo "Done. If you see no errors, the plugin is installed. Build with: cordova build android" 

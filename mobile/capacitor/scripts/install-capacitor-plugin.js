#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "..");
const pluginPath = path.resolve(root, "plugins", "capacitor-plugin-datawedge");
console.log("Installing Capacitor plugin from", pluginPath);
try {
  execSync(`npm pack --silent`, { cwd: pluginPath, stdio: "inherit" });
  const pkgName =
    require(path.join(pluginPath, "package.json")).name + "-1.0.0.tgz";
  const tgz = path.join(pluginPath, pkgName.replace("/", "-").replace("@", ""));
  // fallback: try local install directly
  execSync(`npm install --no-audit --no-fund ${pluginPath}`, {
    cwd: root,
    stdio: "inherit",
  });
  console.log("Installed plugin into mobile/capacitor/node_modules");
} catch (e) {
  console.error("Failed to install plugin", e.message);
  process.exit(1);
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isCordova = process.env.CORDOVA === "true";

// https://vitejs.dev/config/
export default defineConfig({
  // Relative base helps when the app is served from file:// inside Cordova
  base: isCordova ? "./" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});

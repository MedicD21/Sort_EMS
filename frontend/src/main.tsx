import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initDataWedgeBridge } from "./services/datawedgeBridge";
import "./index.css";

// Ensure no stale service workers (avoids HTTPS/mixed-content issues in Cordova)
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Try to initialize DataWedge bridge at app start
initDataWedgeBridge();
